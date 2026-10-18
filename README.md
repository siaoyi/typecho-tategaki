# typecho-tategaki

**README 開頭的介紹**

## English
A Typecho plugin that typesets articles in vertical writing mode. Wrap text in `[tate]…[/tate]` and it is laid out into fixed-height vertical pages, with kinsoku line-breaking rules. It supports ruby annotations (Japanese furigana and Bopomofo/Zhuyin with correctly placed tone marks), the wavy underline for book titles, the straight line for proper nouns, and double-line inline commentary (夾註) that flows across columns.

## 中文

這是一個讓 Typecho 文章以直排顯示的外掛。用 `[tate]…[/tate]` 包住文字，就會排成固定高度的直排頁面，並遵守避頭尾規則。支援注音標示（日文振假名，以及聲調位置正確的注音符號）、書名號波浪線、專名號直線，以及能跨欄接續的雙行夾註。

## 語法對照表

| 寫法 | 效果 |
|---|---|
| `[tate]…[/tate]` | 直排區塊 |
| `漢字{かんじ}`、`[底字]{讀音}` | 注音（右側小字） |
| `[字]{ㄗˋ}`、`漢字{ㄏㄢˋ ㄗˋ}` | 注音符號，逐字標註 |
| `《書名》` | 波浪線（取代書名號） |
| `--專名--` | 專名號直線 |
| `((注文))`、`（（注文））` | 雙行夾註 |

**發布前要確認的事**

1. **外掛資料夾名稱要和程式一致**：Typecho 外掛的資料夾名稱必須和 `Plugin.php` 裡的命名一致，程式目前寫的是 `Furigana`。GitHub 下載的壓縮檔解壓後資料夾會叫 `倉庫名-main`，使用者要手動改成 `Furigana` 才能啟用。如果你想改外掛名稱，就要同時改 `Plugin.php` 裡的命名，以及 `header()` 裡載入 CSS 和 JS 的路徑。
2. **更新 `Plugin.php` 開頭的資訊**：`@author`、`@link`（目前是 typecho.org）、`@version`，改成你的名字和倉庫網址。
3. **授權**：建議用 MIT。你的 CSS 裡有幾個字型名稱（例如標註「需授權」的那個），專案只是引用名稱，沒有附字型檔，所以沒有授權問題，但 README 最好註明「本專案不包含任何字型，請自行安裝」。
4. **環境需求要寫清楚**：外掛用了命名空間，推測需要 Typecho 1.2 以上，這點我是從程式碼推斷的，沒有實測舊版。CSS 用到 `:has()`，需要 Chrome 105、Safari 15.4 以上。自己測過 Chrome 和 Safari，其他瀏覽器可以標「未測試」。
5. **截圖**：你剛才那張《齊物論》的截圖很適合放在 README 最上面，一眼就看得出功能。
6. **示範文字**：選公版的文本（像《莊子》）最保險，避免用有版權的文字。
