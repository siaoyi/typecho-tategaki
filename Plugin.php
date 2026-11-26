<?php

namespace TypechoPlugin\Furigana;

use Typecho\Plugin\PluginInterface;
use Typecho\Plugin as TypechoPlugin;

if (!defined('__TYPECHO_ROOT_DIR__')) {
    exit;
}

/**
 * 振假名：把 漢字{かんじ} 或 [漢字]{かんじ} 轉成 HTML ruby 標籤；
 * 並把 [tate] ... [/tate] 包成直排容器（內容的 Markdown 會先被解析）。
 * 直排容器內：《書名》 轉成波浪線（取代書名號），--專名-- 轉成直線，
 * ((注文)) 轉成雙行夾註（小字兩欄夾在正文裡）。
 * 全站可用：{{紅|文字}} 轉成有顏色的文字（朱批、批註用），顏色名稱見 $colors。
 *
 * @package Furigana
 * @author Siaoyi
 * @version 1.4.0
 * @link https://typecho.org
 */
class Plugin implements PluginInterface
{
    /**
     * 夾註每一段最多幾個小字（兩欄合計）；0 = 不切段（建議）。
     * 換欄時怎麼拆，由 tate.js 依欄尾剩餘空間動態決定，所以這裡不需要切。
     * 沒有 JS 時整段夾註是不可拆的方塊；想在沒有 JS 時也能跟著換欄，才需要設成正數
     * （例如 16 = 每欄 8 個小字），代價是閱讀順序會變成一段一段先右後左。
     */
    const JZ_CHUNK = 0;

    /**
     * 區塊級標籤。專名號、書名號的比對不會跨越這些標籤（避免跨段落亂配對）。
     */
    private static $blockTags = [
        'p', 'div', 'section', 'article', 'blockquote', 'pre', 'hr', 'br',
        'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot',
        'tr', 'td', 'th', 'figure', 'figcaption',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    ];

    /**
     * 顏色名稱 → CSS 顏色，用法：{{紅|文字}}、{{r|文字}}、{{#3498db|文字}}、{{rgb(46,204,113)|文字}}。
     * 名稱不分大小寫，可以自行增減（中文名稱也可以）。
     * 不在這張表裡的，還接受 #十六進位、rgb()/hsl() 與 CSS 顏色英文名稱（例如 crimson）。
     */
    private static $colors = [
        '紅' => 'red', 'r' => 'red',
        '朱' => '#d6402d',
        '橙' => '#e67e22', 'o' => '#e67e22',
        '黃' => '#d4a017', 'y' => '#d4a017',
        '綠' => '#2ecc71', 'g' => '#2ecc71',
        '青' => '#16a085',
        '藍' => '#3498db', 'b' => '#3498db',
        '紫' => '#8e44ad', 'p' => '#8e44ad',
        '褐' => '#8b5a2b',
        '灰' => '#7f8c8d',
        '黑' => '#000000',
    ];

    public static function activate()
    {
        TypechoPlugin::factory('\Widget\Base\Contents')->contentEx = [__CLASS__, 'parse'];
        TypechoPlugin::factory('\Widget\Base\Contents')->excerptEx = [__CLASS__, 'parseExcerpt'];
        TypechoPlugin::factory('\Widget\Archive')->header = [__CLASS__, 'header'];
    }

    public static function deactivate()
    {
    }

    public static function config(\Typecho\Widget\Helper\Form $form)
    {
    }

    public static function personalConfig(\Typecho\Widget\Helper\Form $form)
    {
    }

    /**
     * contentEx 在 Markdown 轉換之後執行，所以處理的是 HTML。
     * 先切開 <pre>/<code>，只處理其餘部分，避免動到程式碼區塊。
     */
    public static function parse($text, $widget, $lastResult)
    {
        $text = empty($lastResult) ? $text : $lastResult;

        // 成對的 [tate] ... [/tate]：包成直排容器，並只在容器內轉換專名號與書名號。
        // 必須先於振假名轉換，這樣 《漢字{かんじ}》 的底字才會被正確包進波浪線裡。
        // [tate] 與 [/tate] 必須各自單獨成段（前後空行），Markdown 會把它們包成 <p>
        $text = preg_replace_callback(
            '#<p>\s*\[tate\]\s*</p>(.*?)<p>\s*\[/tate\]\s*</p>#is',
            function ($m) {
                return '<div class="tate">' . self::convertTate($m[1], false) . '</div>';
            },
            $text
        );

        $parts = preg_split(
            '#(<pre\b.*?</pre>|<code\b.*?</code>)#is',
            $text,
            -1,
            PREG_SPLIT_DELIM_CAPTURE
        );

        foreach ($parts as $i => $part) {
            // 奇數索引是被捕獲的 pre/code 區塊，原樣保留
            if ($i % 2 === 1) {
                continue;
            }
            $parts[$i] = self::convert($part);
        }

        $out = implode('', $parts);

        // 沒有成對的落單標記，維持原本的處理方式
        $out = preg_replace('#<p>\s*\[tate\]\s*</p>#i', '<div class="tate">', $out);
        $out = preg_replace('#<p>\s*\[/tate\]\s*</p>#i', '</div>', $out);

        return $out;
    }

    /**
     * 摘要只做振假名，並移除 [tate] 標記，避免摘要被截斷時留下沒關閉的 div。
     * 摘要裡不畫線：--專名-- 去掉減號，《書名》 保留書名號。
     */
    public static function parseExcerpt($text, $widget, $lastResult)
    {
        $text = empty($lastResult) ? $text : $lastResult;

        $text = preg_replace_callback(
            '#<p>\s*\[tate\]\s*</p>(.*?)<p>\s*\[/tate\]\s*</p>#is',
            function ($m) {
                return self::convertTate($m[1], true);
            },
            $text
        );
        $text = preg_replace('#<p>\s*\[/?tate\]\s*</p>#i', '', $text);

        return self::parse($text, $widget, '');
    }

    /**
     * 直排容器內的處理：
     *   《書名》   → <span class="sm">書名</span>（波浪線，書名號本身拿掉）
     *   --專名--   → <span class="zm">專名</span>（直線）
     * 內容含平假名／片假名（不含 {讀音} 裡的）時自動加上 jp，線畫在右側（日文傍線）。
     * $plain 為 true 時（摘要）不畫線，只去掉 -- 。
     */
    private static function convertTate($html, $plain)
    {
        // pre/code 區塊原樣保留
        $parts = preg_split(
            '#(<pre\b.*?</pre>|<code\b.*?</code>)#is',
            $html,
            -1,
            PREG_SPLIT_DELIM_CAPTURE
        );

        foreach ($parts as $i => $part) {
            if ($i % 2 === 1) {
                continue;
            }
            $parts[$i] = self::marks($part, $plain);
        }

        return implode('', $parts);
    }

    private static function marks($html, $plain)
    {
        // 先把所有標籤與註解換成佔位符，這樣標籤屬性裡的「--」「《」不會被誤判。
        // \x1A…\x1B 代表行內標籤，\x1C…\x1D 代表區塊標籤（比對不可跨越）。
        $tags = [];
        $masked = preg_replace_callback(
            '#<!--.*?-->|</?([a-z][a-z0-9]*)\b[^>]*>#is',
            function ($m) use (&$tags) {
                $i = count($tags);
                $tags[] = $m[0];
                if (isset($m[1]) && in_array(strtolower($m[1]), self::$blockTags, true)) {
                    return "\x1C" . $i . "\x1D";
                }
                return "\x1A" . $i . "\x1B";
            },
            $html
        );

        // 夾註：((…)) 或 （（…）） → 雙行小字。先於書名號與專名號處理。
        $masked = preg_replace_callback(
            '/\(\(([^\x1C\n]+?)\)\)|（（([^\x1C\n]+?)））/u',
            function ($m) use ($plain, &$tags) {
                $inner = (isset($m[2]) && $m[2] !== '') ? $m[2] : $m[1];
                return $plain ? '（' . $inner . '）' : self::jiazhu($inner, $tags);
            },
            $masked
        );

        // 書名號：《…》 → 波浪線
        if (!$plain) {
            $masked = preg_replace_callback(
                '/《([^\x1C\n《》]+)》/u',
                function ($m) {
                    return self::line('sm', $m[1]);
                },
                $masked
            );
        }

        // 專名號：--…--（前後兩個減號夾住；內容頭尾不能是空白，也不能是第三個減號）
        $masked = preg_replace_callback(
            '/(?<!-)--(?!-)(?=\S)([^\x1C\n]+?)(?<=\S)--(?!-)/u',
            function ($m) use ($plain) {
                return $plain ? $m[1] : self::line('zm', $m[1]);
            },
            $masked
        );

        // 還原標籤
        return preg_replace_callback(
            '/[\x1A\x1C](\d+)[\x1B\x1D]/',
            function ($m) use ($tags) {
                return $tags[(int) $m[1]];
            },
            $masked
        );
    }

    /**
     * 雙行夾註。CSS 無法自動把一段文字平分成兩欄，所以在這裡算好「每欄幾個小字」，
     * 寫進 --n，由 CSS 把 inline-block 的長度設成 n 個小字，文字就會剛好折成兩欄。
     * 內容是純文字時，每 JZ_CHUNK 個字切成一段，讓長夾註能跟著正文換欄；
     * 內容含標籤、書名號、專名號或注音時不切段（避免切壞標記），整段當一塊。
     */
    private static function jiazhu($inner, array &$tags)
    {
        $visible = preg_replace(
            '/\{[^{}]*\}|[\x1A\x1C]\d+[\x1B\x1D]|[《》]|--/u',
            '',
            $inner
        );

        if (self::JZ_CHUNK > 0 && $visible === $inner) {
            // 每 JZ_CHUNK 字切一段；避頭尾：下一段不以句讀開頭，這一段不以開括號結尾
            $chars = preg_split('//u', $inner, -1, PREG_SPLIT_NO_EMPTY);
            $total = count($chars);
            $chunks = [];
            $i = 0;
            while ($i < $total) {
                $end = min($i + self::JZ_CHUNK, $total);
                while ($end < $total && preg_match('/[。、，．,.」』）〕〉》】！？!?：；]/u', $chars[$end])) {
                    $end++;
                }
                while ($end - $i > 1 && preg_match('/[「『（〔〈《【]/u', $chars[$end - 1])) {
                    $end--;
                }
                $chunks[] = implode('', array_slice($chars, $i, $end - $i));
                $i = $end;
            }
        } else {
            $chunks = [$inner];
        }

        $out = '';
        foreach ($chunks as $chunk) {
            $len = ($visible === $inner) ? self::charLen($chunk) : self::charLen($visible);
            $n = max(1, (int) ceil($len / 2));
            // 產生的標籤也登記成佔位符：style 裡的「--n」才不會被後面的專名號比對誤抓
            $open = count($tags);
            $tags[] = '<span class="jz" style="--n:' . $n . '">';
            $close = count($tags);
            $tags[] = '</span>';
            $out .= "\x1A" . $open . "\x1B" . $chunk . "\x1A" . $close . "\x1B";
        }

        return $out;
    }

    /** 字數（以 UTF-8 字元計，不依賴 mbstring 擴充） */
    private static function charLen($s)
    {
        return (int) preg_match_all('/./us', $s);
    }

    private static function line($class, $inner)
    {
        // 判斷是否為日文：去掉 {讀音} 與標籤佔位符後，看有沒有假名
        $base = preg_replace('/\{[^{}]*\}|[\x1A\x1C]\d+[\x1B\x1D]/u', '', $inner);
        if (preg_match('/[\x{3041}-\x{3096}\x{30A1}-\x{30FA}\x{31F0}-\x{31FF}]/u', $base)) {
            $class .= ' jp';
        }

        return '<span class="' . $class . '">' . $inner . '</span>';
    }

    /**
     * {{顏色|文字}} → <span style="color:…">文字</span>
     * 顏色與文字之間用 | 隔開（也接受全形的 ｜ 、: 、：）；文字裡可以有注音 {よみ}、粗體等行內標記。
     * 不會跨越段落等區塊標籤；顏色看不懂時整段原樣保留，方便發現打錯。
     */
    private static function colors($html)
    {
        if (strpos($html, '{{') === false) {
            return $html;
        }

        // 標籤換成佔位符：標籤屬性裡的大括號不會被誤判（\x1A…\x1B 行內標籤、\x1C…\x1D 區塊標籤）
        $tags = [];
        $masked = preg_replace_callback(
            '#<!--.*?-->|</?([a-z][a-z0-9]*)\b[^>]*>#is',
            function ($m) use (&$tags) {
                $i = count($tags);
                $tags[] = $m[0];
                if (isset($m[1]) && in_array(strtolower($m[1]), self::$blockTags, true)) {
                    return "\x1C" . $i . "\x1D";
                }
                return "\x1A" . $i . "\x1B";
            },
            $html
        );

        // 結尾的 }} 後面不能再接 }，這樣文字最後面是注音 {よみ} 時（…{よみ}}}）才會從最後兩個 } 結束
        $masked = preg_replace_callback(
            '/\{\{([^{}\x1A-\x1D|｜:：]+)[|｜:：]((?:(?!\}\}(?!\}))[^\x1C])+?)\}\}(?!\})/u',
            function ($m) use (&$tags) {
                $color = self::colorValue($m[1]);
                if ($color === null) {
                    return $m[0];
                }
                $open = count($tags);
                $tags[] = '<span style="color:' . $color . '">';
                $close = count($tags);
                $tags[] = '</span>';
                return "\x1A" . $open . "\x1B" . $m[2] . "\x1A" . $close . "\x1B";
            },
            $masked
        );

        return preg_replace_callback(
            '/[\x1A\x1C](\d+)[\x1B\x1D]/',
            function ($m) use ($tags) {
                return $tags[(int) $m[1]];
            },
            $masked
        );
    }

    /** 顏色名稱 → CSS 顏色；看不懂回傳 null。輸出會放進 style 屬性，所以只放行安全的寫法。 */
    private static function colorValue($name)
    {
        $name = trim($name);
        $key = strtolower($name);
        if (isset(self::$colors[$key])) {
            return self::$colors[$key];
        }
        if (preg_match('/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $name)) {
            return $name;
        }
        if (preg_match('/^(?:rgb|rgba|hsl|hsla)\(\s*[0-9.%,\s\/]+\)$/i', $name)) {
            return $name;
        }
        if (preg_match('/^[a-z]+$/i', $name)) {
            return $name;
        }
        return null;
    }

    private static function convert($html)
    {
        $html = self::colors($html);

        // 形式一：[任意底字]{讀音}，可用於含送假名或非漢字的底字
        $html = preg_replace_callback(
            '/\[([^\[\]{}<>\n]+)\]\{([^{}<>\n]+)\}/u',
            [__CLASS__, 'ruby'],
            $html
        );

        // 形式二：連續漢字緊接 {讀音}，底字為緊鄰的那一串漢字
        $html = preg_replace_callback(
            '/([\x{3400}-\x{4DBF}\x{4E00}-\x{9FFF}\x{F900}-\x{FAFF}\x{3005}\x{3007}]+)\{([^{}<>\n]+)\}/u',
            [__CLASS__, 'ruby'],
            $html
        );

        return $html;
    }

    /**
     * 讀音後面可以接一個或多個「|標記」，用 | 或全形的 ｜ 隔開，順序不拘：
     *   對齊：前 → start（直排從上緣開始）  中 → center  均 → space-between  散 → space-around
     *   顏色：只改這一組注音的顏色，名稱同 {{顏色|文字}}（紅、朱、藍、r、b、#3498db …）
     * 例：念頭之樹{MindTrees|前}、[漢字]{hanzi|前|朱}、日本{にほん|朱}。
     * 沒有標記時讀音原樣；標記裡有看不懂的，整段（含 |）原樣保留，方便發現打錯。
     * 回傳 [讀音, <ruby> 的 style 屬性, <rt> 的 style 屬性]。
     */
    private static function splitRubyOptions($text)
    {
        $align = ['前' => 'start', '中' => 'center', '均' => 'space-between', '散' => 'space-around'];
        $parts = preg_split('/[|｜]/u', $text);
        if (count($parts) < 2) {
            return [$text, '', ''];
        }

        $reading = array_shift($parts);
        $rubyStyle = '';
        $rtStyle = '';
        foreach ($parts as $flag) {
            $flag = trim($flag);
            if (isset($align[$flag])) {
                $rubyStyle = ' style="ruby-align:' . $align[$flag] . '"';
            } elseif (($color = self::colorValue($flag)) !== null) {
                $rtStyle = ' style="color:' . $color . '"';
            } else {
                return [$text, '', ''];
            }
        }

        return [$reading, $rubyStyle, $rtStyle];
    }

    private static function ruby($m)
    {
        list($rt, $rubyStyle, $rtStyle) = self::splitRubyOptions($m[2]);
        return '<ruby' . $rubyStyle . '>' . $m[1] . '<rp>(</rp><rt' . $rtStyle . '>' . $rt . '</rt><rp>)</rp></ruby>';
    }

    public static function header($header, $widget)
    {
        $base = \Widget\Options::alloc()->pluginUrl;
        // 網址後面附上檔案修改時間，改了 CSS／JS 之後瀏覽器會自動重新抓，不用手動清快取
        $css = \Typecho\Common::url('Furigana/tate.css', $base) . '?v=' . @filemtime(__DIR__ . '/tate.css');
        $js = \Typecho\Common::url('Furigana/tate.js', $base) . '?v=' . @filemtime(__DIR__ . '/tate.js');
        echo '<link rel="stylesheet" href="' . $css . '">' . "\n";
        echo '<script src="' . $js . '" defer></script>' . "\n";
        echo '<style>ruby{ruby-align:center}ruby rt{font-size:.5em;letter-spacing:0}</style>' . "\n";
    }
}
