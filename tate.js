(function () {
  var SRC = new WeakMap();
  var CLOSE = /[。、，．,.」』）〕〉》】！？!?：；]/;
  var OPEN = /[「『（〔〈《【]/;
  // 不可拆開的元素：ruby（底字加注音）、標題、分隔線、圖片等整個放在同一頁（表格以「列」為單位拆開）
  var ATOMIC = /^(RUBY|IMG|BR|HR|H[1-6]|PRE|SVG|VIDEO|AUDIO|IFRAME|SCRIPT|STYLE)$/;
  // 只攤平內容、不保留外殼的區塊
  var FLAT = /^(P|DIV)$/;
  var BLOCK = /^(P|H[1-6]|UL|OL|BLOCKQUOTE|DIV|HR|TABLE|PRE)$/;

  function isBlock(n) {
    return n && n.nodeType === 1 && BLOCK.test(n.tagName);
  }

  function isText(n, re) {
    return n && n.nodeType === 3 && re.test(n.nodeValue);
  }

  // 夾註一段：把 chars 排成右欄、左欄兩欄，每欄最多 k 個小字。
  // 欄是自己明確切好的（每欄一個不換行的區塊），不靠瀏覽器自動折行，
  // 所以不會因為避頭尾規則多折出第三欄。回傳這一段實際用掉幾個字。
  function jzPiece(chars, k, link) {
    var total = Math.min(chars.length, 2 * k);
    // 下一個字若是句讀，這一段少放一個字，讓句讀帶著前一個字一起進下一段
    if (total < chars.length && total > 2 && CLOSE.test(chars[total])) total--;
    var c1 = Math.ceil(total / 2);
    // 左欄不以句讀開頭：右欄多放一個（掛在欄尾）；放不下就維持原樣
    if (c1 < total && CLOSE.test(chars[c1]) && c1 < k) c1++;
    // 右欄不以開括號結尾：把它退到左欄（左欄不可超過 k）
    if (c1 > 1 && OPEN.test(chars[c1 - 1]) && total - (c1 - 1) <= k) c1--;

    // 註腳註碼（link）用 <a> 當外殼，仍可點擊跳到註腳；一般夾註用 <span>
    var el = document.createElement(link ? 'a' : 'span');
    el.className = link ? 'jz footnote-ref' : 'jz';
    if (link) {
      el.setAttribute('href', link.href);
      if (link.id) el.id = link.id;
    }
    el.style.inlineSize = 'auto'; // 長度由最長的那一欄決定，不用 --n
    [chars.slice(0, c1), chars.slice(c1, total)].forEach(function (cs) {
      if (!cs.length) return;
      var c = document.createElement('span');
      c.className = 'jz-c';
      c.textContent = cs.join('');
      el.appendChild(c);
    });
    return { el: el, used: total };
  }

  // 註腳註碼：<sup><a class="footnote-ref" href="#fn-1">1</a></sup>
  function fnRef(n) {
    var a = n.children.length === 1 ? n.children[0] : null;
    if (!a || a.tagName !== 'A') return null;
    var href = a.getAttribute('href') || '';
    return a.classList.contains('footnote-ref') || /^#fn/.test(href) ? a : null;
  }

  // 1 → 註一、12 → 註一二（逐位轉，與 CSS 的 cjk-decimal 一致）
  function fnLabel(text) {
    var d = (String(text).match(/\d+/) || [''])[0];
    if (!d) return '註' + String(text).trim();
    return '註' + d.replace(/\d/g, function (x) { return '〇一二三四五六七八九'.charAt(x); });
  }

  // 表格：以「列」為單位拆開，才能跨頁；跨頁時在新的一頁重複表頭（thead）。
  // 直排時列是由右往左排的直欄，列裡的儲存格由上往下排，所以一頁放得下幾列由頁寬決定。
  function flattenTable(table, chain, out) {
    var tspec = { proto: table.cloneNode(false), head: [] };
    Array.from(table.children).forEach(function (sec) {
      if (sec.tagName === 'THEAD') {
        Array.from(sec.children).forEach(function (tr) {
          tspec.head.push(tr.cloneNode(true));
        });
      }
    });
    var tchain = chain.concat([tspec]);
    Array.from(table.children).forEach(function (sec) {
      var t = sec.tagName;
      if (t === 'TR') {
        out.push({ node: sec.cloneNode(true), chain: tchain, th: tspec });
      } else if (t === 'THEAD' || t === 'TBODY' || t === 'TFOOT') {
        var schain = tchain.concat([{ proto: sec.cloneNode(false) }]);
        var isHead = t === 'THEAD';
        Array.from(sec.children).forEach(function (tr) {
          if (tr.tagName === 'TR') out.push({ node: tr.cloneNode(true), chain: schain, th: tspec, head: isHead });
        });
      }
    });
  }

  // 標題開頭的編號：去掉小點。
  // 一～兩位數 → 包進 <span class="tcy">，用 text-combine-upright 直立壓成一格（12 會是並排的兩個數字）；
  // 三位數以上、或「3.1」這種含小數點的 → 轉全形數字（每個數字各佔一格，直排天生直立）。
  // 只轉「後面接標點或空白」的編號，所以「2024年…」「第3章」這類不受影響。
  // 同時在標題上寫入 --hang（編號加後面的空格佔幾個字寬），CSS 用它做凸排：標題換欄後，第二欄對齊文字的起點。
  function fixHeadingNumber(h) {
    var t = h;
    while (t && t.nodeType !== 3) t = t.firstChild;
    if (!t) return;
    var m = t.nodeValue.match(/^\s*(\d+(?:[.．]\d+)*)(?:\s*[.．、)）]\s*|\s+)(?=\S)/);
    if (!m) {
      // 漢字數字編號（「九、」「十二、」「（一）」）：文字不動，只設定凸排寬度＝編號（含頓號或括號）的字數
      var c = t.nodeValue.match(/^\s*([（(][一二三四五六七八九十百千〇零]+[）)]|[一二三四五六七八九十百千〇零]+[、．.])/);
      if (c) h.style.setProperty('--hang', Array.from(c[1]).length + 'em');
      return;
    }
    var num = m[1];
    var frag = document.createDocumentFragment();
    var hang;
    if (/^\d{1,2}$/.test(num)) {
      var sp = document.createElement('span');
      sp.className = 'tcy';
      sp.textContent = num;
      frag.appendChild(sp);
      hang = 2; // 壓成一格（1 字）＋空格（1 字）
    } else {
      var fw = num.replace(/\d/g, function (d) { return String.fromCharCode(0xFF10 + Number(d)); }).replace(/\./g, '．');
      frag.appendChild(document.createTextNode(fw));
      hang = fw.length + 1; // 每個全形字 1 字＋空格 1 字
    }
    frag.appendChild(document.createTextNode('　' + t.nodeValue.slice(m[0].length)));
    t.parentNode.replaceChild(frag, t);
    h.style.setProperty('--hang', hang + 'em');
  }

  // 把內容攤平成「單位」：文字逐字，每個單位帶著它所在的外殼鏈（blockquote、li、strong…）。
  // 外殼可以跨頁複製，所以引用、清單、粗體等都能接續上一頁的空白往下排。
  function flatten(node, chain, out) {
    node.childNodes.forEach(function (n) {
      if (n.nodeType === 3) {
        // 區塊元素之間的換行字元不當成內容
        if (!n.nodeValue.trim() && (isBlock(n.previousSibling) || isBlock(n.nextSibling))) return;
        Array.from(n.nodeValue).forEach(function (ch) {
          out.push({ node: document.createTextNode(ch), chain: chain });
        });
        return;
      }
      if (n.nodeType !== 1) return;

      var tag = n.tagName;
      if (ATOMIC.test(tag)) {
        var atom = n.cloneNode(true);
        if (/^H[1-6]$/.test(tag)) fixHeadingNumber(atom);
        out.push({ node: atom, chain: chain });
      } else if (tag === 'SPAN' && n.classList.contains('jz') && n.childNodes.length === 1 && n.firstChild.nodeType === 3) {
        // 雙行夾註（純文字）：整段當成一個單位，排版時依欄尾剩餘空間動態拆開
        out.push({ jz: Array.from(n.firstChild.nodeValue), chain: chain });
      } else if (tag === 'SUP' && fnRef(n)) {
        // 註腳註碼：改成雙行夾註的「註一」「註二」，不再用會與正文重疊的上標
        var fa = fnRef(n);
        out.push({
          jz: Array.from(fnLabel(fa.textContent)),
          chain: chain,
          link: { href: fa.getAttribute('href'), id: n.id || fa.id }
        });
      } else if (tag === 'TABLE') {
        flattenTable(n, chain, out);
      } else if (tag === 'UL' || tag === 'OL') {
        // 每一項各包在自己的 ul/ol 裡；有序清單用 counter-reset 接續編號（計數器名稱要和 CSS 的 tate-ol 一致）
        var base = tag === 'OL' ? (parseInt(n.getAttribute('start'), 10) || 1) - 1 : 0;
        var i = 0;
        Array.from(n.children).forEach(function (li) {
          if (li.tagName !== 'LI') return;
          var wrap = n.cloneNode(false);
          if (tag === 'OL') wrap.style.counterReset = 'tate-ol ' + (base + i);
          i++;
          flatten(li, chain.concat([{ proto: wrap }, { proto: li.cloneNode(false) }]), out);
        });
      } else if (FLAT.test(tag) && !n.classList.contains('footnotes')) {
        flatten(n, chain, out);
        if (tag === 'P') out.push({ node: document.createTextNode('\n'), chain: chain });
      } else {
        flatten(n, chain.concat([{ proto: n.cloneNode(false) }]), out);
      }
    });
    return out;
  }

  // 直排時超出頁寬的內容會溢出到左邊
  function over(p) {
    return p.scrollWidth > p.clientWidth + 1;
  }

  function paginate(root) {
    var src = SRC.get(root);
    if (src === undefined) {
      src = root.innerHTML;
      SRC.set(root, src);
    }

    var tmp = document.createElement('div');
    tmp.innerHTML = src;
    var list = flatten(tmp, [], []);

    root.innerHTML = '';
    root.classList.add('tate-paged');

    var page;
    var stack; // 目前頁面上開著的外殼：[{ spec, el, was }]
    var headItems = []; // 目前頁面上還「單獨躺著」的表頭列（後面還沒接資料列）

    function openPage() {
      page = document.createElement('div');
      page.className = 'tate-page';
      root.appendChild(page);
      stack = [];
      headItems = [];
    }

    // 讓頁面開著的外殼與單位的外殼鏈一致；跨頁接續的外殼加上 tate-cont
    function enter(chain) {
      var k = 0;
      while (k < stack.length && k < chain.length && stack[k].spec === chain[k]) k++;
      stack.length = k;
      var parent = k ? stack[k - 1].el : page;
      var n = 0;
      for (var i = k; i < chain.length; i++) {
        var spec = chain[i];
        var el = spec.proto.cloneNode(false);
        if (spec.opened) {
          el.classList.add('tate-cont');
          // 表格跨頁：新的一頁重複表頭
          if (spec.head && spec.head.length) {
            var th = document.createElement('thead');
            th.className = 'tate-rep';
            spec.head.forEach(function (tr) {
              th.appendChild(tr.cloneNode(true));
            });
            el.appendChild(th);
          }
        }
        parent.appendChild(el);
        stack.push({ spec: spec, el: el, was: !!spec.opened });
        spec.opened = true;
        parent = el;
        n++;
      }
      return { parent: parent, n: n };
    }

    function popShell() {
      var t = stack.pop();
      t.el.parentNode.removeChild(t.el);
      t.spec.opened = t.was;
    }

    function place(item) {
      var r = enter(item.chain);
      r.parent.appendChild(item.node);
      return r;
    }

    // 離 el 最近的區塊容器（夾註的欄長要以它的內容區為準，不是整個頁面：
    // 清單項目有縮排、引文有內距，這些都會讓每一欄能用的長度比頁高短）
    function blockOf(el) {
      while (el && el !== page) {
        var d = getComputedStyle(el).display;
        if (d === 'block' || d === 'list-item' || d === 'flow-root' || d === 'flex') return el;
        el = el.parentNode;
      }
      return page;
    }

    // 雙行夾註：這一欄剩多少空間就先放多少（右欄、左欄各 k 個小字），其餘接到下一欄，
    // 不會整塊跳到下一欄而在欄尾留一片空白。
    function placeJz(item) {
      var chars = item.jz.slice();
      var guard = 0;
      while (chars.length && guard++ < 2000) {
        var fresh = page.childNodes.length === 0;
        var r = enter(item.chain);

        // 量出一個小字實際佔的高度（瀏覽器可能有最小字級等設定，不能假設剛好是正文的一半）
        var probe = document.createElement('span');
        probe.className = 'jz';
        probe.style.inlineSize = 'auto';
        var pc = document.createElement('span');
        pc.className = 'jz-c';
        pc.textContent = '一二三四五六七八九十';
        probe.appendChild(pc);
        r.parent.appendChild(probe);
        var unit = probe.getBoundingClientRect().height / 10;
        r.parent.removeChild(probe);

        // 這個區塊容器每一欄實際能用的範圍（扣掉上下的內距與邊框）
        var box = blockOf(r.parent);
        var cs = getComputedStyle(box);
        var br = box.getBoundingClientRect();
        var padTop = parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop);
        var padBottom = parseFloat(cs.borderBottomWidth) + parseFloat(cs.paddingBottom);
        var lineStart = br.top + padTop;
        var lineEnd = br.bottom - padBottom;
        var avail = lineEnd - lineStart;

        var cap = Math.max(1, Math.floor(avail / unit + 1e-6)); // 一整欄放得下幾個小字
        var need = Math.min(Math.ceil(chars.length / 2), cap); // 剩下的字，每欄想放幾個

        // 量這一欄現在排到哪裡、還剩多少
        var marker = document.createElement('i');
        marker.style.cssText = 'display:inline-block;inline-size:0;block-size:0';
        r.parent.appendChild(marker);
        var mt = marker.getBoundingClientRect().top;
        var left = lineEnd - mt;

        var piece = null;
        var k, cand, rect;
        // 先試著塞進這一欄剩下的空間：起點沒有被擠到別欄、終點也沒超出這欄的底
        for (k = Math.min(need, Math.floor(left / unit + 1e-6)); k >= 1; k--) {
          cand = jzPiece(chars, k, item.link);
          r.parent.appendChild(cand.el);
          rect = cand.el.getBoundingClientRect();
          if (rect.top >= mt - 1 && rect.bottom <= lineEnd + 1) {
            piece = cand;
            break;
          }
          r.parent.removeChild(cand.el);
        }
        if (!piece) {
          // 這一欄放不下：整段放到下一欄；一樣檢查不超出欄底，超出就每欄少放一個字
          for (k = need; k >= 1; k--) {
            cand = jzPiece(chars, k, item.link);
            r.parent.appendChild(cand.el);
            if (cand.el.getBoundingClientRect().bottom <= lineEnd + 1) {
              piece = cand;
              break;
            }
            r.parent.removeChild(cand.el);
          }
          if (!piece) {
            piece = jzPiece(chars, 1, item.link);
            r.parent.appendChild(piece.el);
          }
        }
        r.parent.removeChild(marker);

        if (over(page) && !fresh) {
          // 這一頁放不下：退回，換新頁後重來
          r.parent.removeChild(piece.el);
          for (var j = 0; j < r.n; j++) popShell();
          stack.forEach(function (sh) {
            if (item.chain.indexOf(sh.spec) !== -1) sh.el.classList.add('tate-more');
          });
          openPage();
          continue;
        }
        chars = chars.slice(piece.used);
      }
    }

    openPage();

    list.forEach(function (item) {
      if (item.jz) {
        placeJz(item);
        headItems = [];
        return;
      }

      var blank = item.node.nodeType === 3 && !item.node.nodeValue.trim();
      if (blank && !page.firstChild) return; // 頁首不放空白或換行

      var r = place(item);
      if (!over(page)) {
        // 記住單獨躺著的表頭列；接著放上資料列或其他內容後就清掉
        if (item.head) {
          if (headItems.length && headItems[0].th !== item.th) headItems = [];
          headItems.push(item);
        } else {
          headItems = [];
        }
        return;
      }

      // 溢出：把這個單位退回，移到下一頁
      r.parent.removeChild(item.node);
      for (var j = 0; j < r.n; j++) popShell();
      if (blank) return; // 段落換行剛好在頁尾，直接捨棄

      var moved = [item];

      // 表頭不單獨留在頁尾：資料列放不下時，把剛放上去的表頭一起移到下一頁
      // （頁面上除了這張表還有別的內容才移；否則移了也只是換一頁，沒有意義）
      if (item.th && !item.head && headItems.length && headItems[0].th === item.th) {
        var tableEl = headItems[0].node.closest('table');
        if (tableEl && page.textContent.length > tableEl.textContent.length) {
          headItems.forEach(function (h) {
            var par = h.node.parentNode;
            par.removeChild(h.node);
            if (!par.firstChild && par.parentNode) par.parentNode.removeChild(par); // 空的 thead 外殼
          });
          while (stack.length && !stack[stack.length - 1].el.firstChild) popShell(); // 空的 table 外殼
          headItems[0].chain.forEach(function (sp) {
            if (!stack.some(function (sh) { return sh.spec === sp; })) sp.opened = false;
          });
          moved = headItems.concat([item]);
        }
      }

      // 避頭尾：句讀不單獨出現在頁首，開括號不單獨留在頁尾（只處理同一個外殼內的相鄰字）
      if (r.n === 0) {
        var last = r.parent.lastChild;
        if (isText(item.node, CLOSE) && last) {
          r.parent.removeChild(last);
          moved.unshift({ node: last, chain: item.chain });
          last = r.parent.lastChild;
        }
        while (isText(last, OPEN)) {
          r.parent.removeChild(last);
          moved.unshift({ node: last, chain: item.chain });
          last = r.parent.lastChild;
        }
        // 退字之後如果外殼變空，一併拿掉
        while (stack.length && !stack[stack.length - 1].el.firstChild) popShell();
      }

      // 這一頁仍開著、而且會在下一頁接續的外殼，標記為 tate-more
      stack.forEach(function (sh) {
        if (item.chain.indexOf(sh.spec) !== -1) sh.el.classList.add('tate-more');
      });

      openPage();
      moved.forEach(place);
    });

    if (!page.firstChild) root.removeChild(page);
  }

  function run() {
    document.querySelectorAll('.tate').forEach(paginate);
  }

  function start() {
    var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(run);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // 只有寬度改變（例如手機轉向）才重新分頁
  var w = window.innerWidth;
  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (window.innerWidth !== w) {
        w = window.innerWidth;
        run();
      }
    }, 300);
  });
})();