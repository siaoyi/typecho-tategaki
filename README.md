# typecho-tategaki

**直排排版外掛 · Vertical Text Plugin for Typecho**

[繁體中文](#繁體中文) · [English](#english)

![docs/screenshot.png ](https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgaLhhq4VnbJQDiti2yVc4GCk8dv_TEdb4RwvWcZNIiAg9G2gRKBXGU8KLz7eMn9dqLwA0nwNVPndxQUf4mhyphenhyphenmS7jvkb0nC_KbVozoZd8kbYLEGgUP0ber7FO9YeSkOwnhg81JDDMGjs8xnxSicbzrMhvIkyJEN1Lw7f6dh2UtxxIpjHISDfOGOK6I0bAA/s1542/image.png)／ 

---

# 繁體中文

## 簡介

讓 [Typecho](https://typecho.org) 文章以**直排**顯示的外掛。用 `[tate]…[/tate]` 包住文字，就會自動排成固定高度的直排頁面，並遵守避頭尾規則。除了直排本身，也支援古籍與日文常見的標示：

- **注音**：日文振假名，以及聲調位置正確的注音符號
- **書名號**：`《書名》` 轉成波浪線（取代書名號）
- **專名號**：`--專名--` 轉成直線
- **雙行夾註**：`((注文))` 轉成兩欄小字，能跨欄接續
- 標題層級、豎線分割線、清單（漢數字編號）、引文等 Markdown 樣式的直排版本

## 環境需求

| 項目 | 需求 |
|---|---|
| Typecho | 1.2 以上（外掛使用了命名空間式的外掛介面） |
| PHP | 7.0 以上（程式碼使用了 `"\u{...}"` 語法） |
| 瀏覽器 | 需支援 CSS `:has()` 與 `svh` 單位（Chrome 108+、Safari 15.4+、Firefox 121+）；`text-wrap: balance` 為選用，不支援時只是少了標題換行的均衡效果 |

> 以上版本需求是依程式碼用到的語法與 API 推斷的。作者實際測試的環境：Typecho（1.3.0）、PHP（8.2）、macOS 上的 Chrome Version 154.0.8037.99 (Official Build) (arm64)與 Safari Version 27.0.1 (22625.1.29.11.28)。Firefox 與其他瀏覽器未測試。

## 安裝

1. 下載本倉庫（`Code` → `Download ZIP`），或用 `git clone`。
2. **把資料夾改名為 `Furigana`**，確認裡面有 `Plugin.php`、`tate.css`、`tate.js` 三個檔案。
   Typecho 要求外掛資料夾名稱和 `Plugin.php` 裡的命名空間一致，GitHub 下載的資料夾預設叫 `typecho-tategaki-main`，不改名無法啟用。
3. 把 `Furigana` 資料夾上傳到網站的 `usr/plugins/`。
4. 登入後台，到「控制台 → 外掛」，啟用這個外掛。
5. 確認你的主題的 `header.php` 有呼叫 `$this->header()`。外掛是靠這個掛鉤載入 CSS 與 JS 的，沒有的話，直排不會生效。

## 使用方式

### 直排區塊

```
[tate]

這裡的文字會直排。

[/tate]
```

`[tate]` 和 `[/tate]` 要**各自單獨成段**（前後各空一行）。中間的內容照一般 Markdown 寫，標題、清單、引文、粗體、分割線都可以。

### 語法一覽

| 寫法 | 效果 | 限制 |
|---|---|---|
| `[tate]…[/tate]` | 直排區塊，自動分頁 | |
| `漢字{かんじ}` | 注音，在字的右側（緊鄰大括號前的那一串漢字為底字） | 橫排文章也會轉換 |
| `[任意底字]{讀音}` | 注音，底字不限漢字 | 橫排文章也會轉換 |
| `[字]{ㄗˋ}`、`漢字{ㄏㄢˋ ㄗˋ}` | 注音符號，逐字標註，聲調排在符號右側 | |
| `[子]{˙ㄗ}` | 輕聲，點排在符號上方 | |
| `《書名》` | 波浪線，書名號本身拿掉 | 只在 `[tate]` 內 |
| `--專名--` | 直線（專名號） | 只在 `[tate]` 內 |
| `((注文))`、`（（注文））` | 雙行夾註 | 只在 `[tate]` 內 |

### 範例

```
[tate]

## 齊物論

--南郭子綦--隱几而坐((隱，憑也。))，仰天而噓，荅焉似喪其耦。

[形]{ㄒㄧㄥˊ}固可使如槁木，而心固可使如死灰乎？《莊子》

1. 第一項
2. 第二項

[/tate]
```

### 各語法的細節

**注音（振假名）**
`漢字{かんじ}` 的底字是緊鄰大括號前的連續漢字；底字含送假名或其他字元時，用 `[底字]{讀音}`。

**注音符號**
- 一聲不標調號。二、三、四聲寫在最後一個符號後面（`ㄏㄢˋ`），輕聲寫在前面（`˙ㄗ`）。
- 多個字可以用空格分開每個字的注音，字數對得上就逐字標註：`漢字{ㄏㄢˋ ㄗˋ}`。不加空格也可以（`ㄏㄢˋㄗˋ`），外掛會依調號拆開。
- 連續的**一聲**音節沒有調號可以當分界，請用空格分開，例如 `[媽媽]{ㄇㄚ ㄇㄚ}`。
- 音節數與字數對不上時，整組會標在一起。

**專名號**
- `--` 要緊貼文字：`--老子--` 可以，`-- 老子 --` 不行，英文裡的 `a -- b` 也不會被誤判。
- 預設畫在字的左側。內容含平假名或片假名時，自動改畫在右側（日文傍線）；含注音的詞會退回左側，避免跟注音重疊。

**書名號**
`《…》` 轉成波浪線後，書名號本身會拿掉。

**雙行夾註**
- 夾註是兩欄小字（先右欄、再左欄），排版時依欄尾剩餘的空間自動拆開、接到下一欄。
- 夾註內如果有書名號、專名號、注音或 HTML 標籤，就不會自動拆開，整段當一塊處理，請寫短一點。
- 全形和半形各自成對，不能混用。

**清單**
有序清單的編號是逐位轉成漢數字（5 → 五、12 → 一二、123 → 一二三）。HTML 的 `<ol start="…">` 有支援，但 Markdown 不一定會輸出 `start` 屬性，需要時請直接寫 HTML。

**摘要**
列表頁如果主題用 `excerpt()` 取摘要，摘要裡不畫線：`--專名--` 變成純文字，`((夾註))` 變成一般括號，書名號保留。主題如果是用 `content()` 顯示全文，則走完整轉換。

## 自訂樣式

所有樣式都在 `tate.css`，常調整的地方：

| 想調整 | 位置 |
|---|---|
| 頁面高度（也決定字的大小，每欄 32 字） | `.tate` 的 `--len` |
| 夾註字級 | `.jz` 的 `--jz`（倍率；兩欄合計寬度不可超過一欄正文的 2 個字寬，上限約 0.9） |
| 專名號與字的距離 | `.zm` 的 `padding-left`（日文右側版本另有 `.zm.jp`） |
| 波浪線的樣式與大小 | `.sm` 的 `background-image`、`background-size` |
| 注音大小 | `rt.zy` 的 `font-size` |
| 聲調符號位置 | `.zt2`～`.zt4` 的 `bottom`、`margin-left`；輕聲 `.zt5` 的 `top` |
| 標題層級 | `h1`～`h6` 的規則 |
| 清單符號區寬度 | `.tate .tate-page li` 的 `padding-inline-start` |
| 注音或標題等的字型 | 各規則裡的 `font-family`（本專案不附任何字型，請自行安裝） |

`Plugin.php` 開頭的 `JZ_CHUNK` 可讓夾註在沒有 JavaScript 時也能跟著換欄，預設為 0（不切段），一般不需要改。

## 已知限制

- **需要 JavaScript**：分頁、避頭尾、夾註換欄都由 `tate.js` 完成。沒有 JavaScript 時，內容是一整條可橫向捲動的直排。
- **載入時會有短暫跳動**：頁面先顯示未分頁的版本，等字型載入、分頁完成後才換成最終版面，通常一到兩秒。
- **效能**：`tate.js` 是一個字一個字放進頁面並量版面，文章很長、或單頁有很多篇直排文章時，載入可能變慢。只有視窗寬度改變時才會重新分頁。
- **夾註含標記時不自動拆開**（見上）。夾註不可巢狀，夾註裡也不建議放注音。
- **專名號與書名號巢狀**（例如 `--《史記》--`）時，兩條線都畫在同一側，會疊在一起，請避免。
- **`[tate]` 區塊不能放在清單或引文裡面**，也不能巢狀。
- **轉換只作用於文章內容**，不會處理 `<pre>`、`<code>`、HTML 屬性與註解裡的標記。
- **只針對 Typecho 預設主題的樣式測試過**，其他主題如果對 `hr`、`blockquote`、標題或清單有自己的樣式，可能需要調整 `tate.css`。
- **沒有附任何字型**。聲調符號是單獨用橫排畫的，不依賴字型的 OpenType 功能，但位置數值是依作者使用的字型調的，換字型後可能需要微調。

## 運作原理

| 檔案 | 負責什麼 |
|---|---|
| `Plugin.php` | 把文章裡的標記轉成 HTML（`contentEx` 與 `excerptEx` 掛鉤），並在 `<head>` 載入 CSS 與 JS（網址附上檔案修改時間，更新後瀏覽器會自動重新抓） |
| `tate.css` | 直排版面與所有樣式 |
| `tate.js` | 分頁、避頭尾、雙行夾註依欄尾空間換欄 |

## 授權

MIT License。

## 參與

歡迎開 Issue 回報問題或提出建議。回報排版問題時，附上截圖與原始文字會很有幫助。

---

# English

## Overview

A [Typecho](https://typecho.org) plugin that typesets articles in **vertical writing mode** (tategaki). Wrap text in `[tate]…[/tate]` and it is laid out into fixed-height vertical pages with kinsoku line-breaking rules. Beyond vertical layout, it supports marks common in classical Chinese and Japanese typesetting:

- **Ruby**: Japanese furigana, and Bopomofo (Zhuyin) with correctly placed tone marks
- **Book-title mark**: `《Title》` becomes a wavy line (replacing the brackets)
- **Proper-noun mark**: `--Name--` becomes a straight line
- **Double-line inline notes** (夾註): `((note))` becomes two columns of small text that can flow across columns
- Vertical versions of headings, vertical rules, lists (numbered with Chinese numerals), and blockquotes

## Requirements

| Item | Requirement |
|---|---|
| Typecho | 1.2 or later (the plugin uses the namespaced plugin API) |
| PHP | 7.0 or later (the code uses the `"\u{...}"` string syntax) |
| Browser | CSS `:has()` and the `svh` unit are required (Chrome 108+, Safari 15.4+, Firefox 121+). `text-wrap: balance` is optional; without it, wrapped headings just aren't balanced. |

> These requirements are inferred from the syntax and APIs the code uses. The author tested with Typecho (fill in version), PHP (fill in version), and Chrome and Safari on macOS. Firefox and other browsers are untested.

## Installation

1. Download this repository (`Code` → `Download ZIP`) or `git clone` it.
2. **Rename the folder to `Furigana`**, and make sure it contains `Plugin.php`, `tate.css`, and `tate.js`.
   Typecho requires the plugin folder name to match the namespace in `Plugin.php`. The folder from a GitHub download is named `typecho-tategaki-main` by default, and the plugin cannot be activated unless it is renamed.
3. Upload the `Furigana` folder to `usr/plugins/` on your site.
4. In the admin panel, go to *Console → Plugins* and activate the plugin.
5. Make sure your theme's `header.php` calls `$this->header()`. The plugin loads its CSS and JS through that hook; without it, vertical layout will not take effect.

## Usage

### Vertical block

```
[tate]

Text here is set vertically.

[/tate]
```

`[tate]` and `[/tate]` must each be **on their own paragraph** (blank line before and after). Write the content inside as ordinary Markdown: headings, lists, blockquotes, bold text, and horizontal rules all work.

### Syntax reference

| Write | Result | Limits |
|---|---|---|
| `[tate]…[/tate]` | Vertical block, paginated automatically | |
| `漢字{かんじ}` | Ruby on the right side of the characters (the run of Han characters right before the brace is the base) | Also converted in horizontal posts |
| `[any base]{reading}` | Ruby with any base text | Also converted in horizontal posts |
| `[字]{ㄗˋ}`, `漢字{ㄏㄢˋ ㄗˋ}` | Bopomofo ruby, one syllable per character, tone marks placed to the right of the symbols | |
| `[子]{˙ㄗ}` | Neutral tone, dot placed above the symbols | |
| `《Title》` | Wavy line; the brackets are removed | Inside `[tate]` only |
| `--Name--` | Straight line (proper-noun mark) | Inside `[tate]` only |
| `((note))`, `（（note））` | Double-line inline note | Inside `[tate]` only |

### Example

```
[tate]

## 齊物論

--南郭子綦--隱几而坐((隱，憑也。))，仰天而噓，荅焉似喪其耦。

[形]{ㄒㄧㄥˊ}固可使如槁木，而心固可使如死灰乎？《莊子》

1. First item
2. Second item

[/tate]
```

### Details

**Ruby (furigana)**
For `漢字{かんじ}`, the base is the run of consecutive Han characters right before the brace. When the base includes okurigana or other characters, use `[base]{reading}`.

**Bopomofo**
- The first tone has no mark. Tones 2–4 go after the last symbol (`ㄏㄢˋ`); the neutral tone goes before (`˙ㄗ`).
- For several characters, separate each character's reading with spaces and, if the counts match, each character is annotated individually: `漢字{ㄏㄢˋ ㄗˋ}`. Without spaces (`ㄏㄢˋㄗˋ`) also works; the plugin splits at the tone marks.
- Consecutive **first-tone** syllables have no tone mark to split on, so separate them with spaces, e.g. `[媽媽]{ㄇㄚ ㄇㄚ}`.
- If the number of syllables does not match the number of characters, the whole reading is attached to the base as one group.

**Proper-noun mark**
- The `--` must touch the text: `--老子--` works, `-- 老子 --` does not, and `a -- b` in English is not misread.
- The line is drawn on the left side by default. If the content contains hiragana or katakana, it is drawn on the right side instead (Japanese sideline); words that carry ruby fall back to the left to avoid colliding with the ruby.

**Book-title mark**
`《…》` becomes a wavy line, and the brackets themselves are removed.

**Double-line inline notes**
- A note is two columns of small text (right column first, then left). During layout it is split according to the space left at the end of the column and continues in the next one.
- A note that contains a book-title mark, a proper-noun mark, ruby, or HTML tags is not split automatically and is treated as a single block, so keep those short.
- Full-width and half-width parentheses must be paired with their own kind; mixing them does not work.

**Lists**
Ordered-list numbers are converted digit by digit into Chinese numerals (5 → 五, 12 → 一二, 123 → 一二三). `<ol start="…">` is supported, but Markdown does not always emit a `start` attribute; write the HTML directly when you need it.

**Excerpts**
If your theme uses `excerpt()` on list pages, no lines are drawn in the excerpt: `--Name--` becomes plain text, `((note))` becomes ordinary parentheses, and book-title brackets are kept. If the theme shows full content with `content()`, the full conversion applies.

## Customization

All styling lives in `tate.css`. Common adjustments:

| To change | Where |
|---|---|
| Page height (this also sets the character size; each column holds 32 characters) | `--len` on `.tate` |
| Note font size | `--jz` on `.jz` (a ratio; the two columns together must stay under 2 character widths, so about 0.9 at most) |
| Gap between the proper-noun line and the text | `padding-left` on `.zm` (the Japanese right-side variant is `.zm.jp`) |
| Wavy line shape and size | `background-image` and `background-size` on `.sm` |
| Bopomofo size | `font-size` on `rt.zy` |
| Tone-mark position | `bottom` and `margin-left` on `.zt2`–`.zt4`; `top` on the neutral-tone `.zt5` |
| Heading hierarchy | the `h1`–`h6` rules |
| Width of the list marker area | `padding-inline-start` on `.tate .tate-page li` |
| Fonts for ruby, headings, etc. | the `font-family` in each rule (this project ships no fonts; install your own) |

The `JZ_CHUNK` constant at the top of `Plugin.php` lets notes wrap across columns even without JavaScript. It defaults to 0 (no chunking) and normally does not need changing.

## Known limitations

- **JavaScript is required.** Pagination, kinsoku, and column-wrapping of notes are all done by `tate.js`. Without JavaScript the content is one long, horizontally scrollable vertical strip.
- **Brief flash on load.** The page first shows the unpaginated version, then switches to the final layout once fonts have loaded and pagination is done, usually within a second or two.
- **Performance.** `tate.js` places text character by character and measures the layout, so very long articles, or a list page with many vertical posts, may load slowly. Re-pagination only happens when the window width changes.
- **Notes containing markup are not split automatically** (see above). Notes cannot be nested, and ruby inside a note is not recommended.
- **Nesting a proper-noun mark and a book-title mark** (e.g. `--《史記》--`) draws both lines on the same side, so they overlap. Avoid it.
- **A `[tate]` block cannot be placed inside a list or blockquote, and cannot be nested.**
- **Conversion applies to post content only**, and leaves `<pre>`, `<code>`, HTML attributes, and comments alone.
- **Tested only against the default Typecho theme.** Themes that style `hr`, `blockquote`, headings, or lists themselves may need adjustments in `tate.css`.
- **No fonts are bundled.** Tone marks are drawn separately in horizontal mode and do not depend on OpenType features of the font, but the offsets were tuned to the author's font and may need fine-tuning with yours.

## How it works

| File | Responsibility |
|---|---|
| `Plugin.php` | Converts markup in the post into HTML (via the `contentEx` and `excerptEx` hooks) and loads the CSS and JS in `<head>` (URLs carry the file's modification time, so browsers refetch after an update) |
| `tate.css` | Vertical layout and all styling |
| `tate.js` | Pagination, kinsoku, and wrapping of double-line notes by remaining column space |

## License

MIT License.

## Contributing

Issues and suggestions are welcome. For layout problems, a screenshot and the source text help a lot.
