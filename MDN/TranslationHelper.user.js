// ==UserScript==
// @name        MDN Translation Helper
// @description MDNで翻訳を行う際に自動で色々します。
// @namespace   https://github.com/mozilla-japan/translation/
// @author      unarist
// @version     0.2
// @downloadURL https://raw.githubusercontent.com/mozilla-japan/translation/master/MDN/TranslationHelper.user.js
// @supportURL  https://github.com/mozilla-japan/translation/issues
// @match       https://developer.mozilla.org/*/docs/*
// ==/UserScript==

// TODO: 適用する処理を選べるように？
// TODO: 事前or事後の確認（diffを出せるとgood）
// TODO: 自動翻訳の充実
// TODO: 追加翻訳時にも適用できる処理がないか
// TODO: ja以外の翻訳で起動しないように
// TODO: WISYWIGエディタを使う以上マークアップに細かいブレがあってパターンに合わないことがある

(function() {
    'use strict';

    class BodyProcessor {
        constructor() {
            this.src_str = $('.translate-source').text();
            this.editor = CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]];
            this.dest_str = this.editor.getData();
            this.work_str = this.dest_str;
        }
        save() {
            this.editor.setData(this.work_str);
        }
        addNameAttribute() {
            // name属性の追加（id属性対策）
            // 現在のid属性を流用するので、翻訳済みの文章には適用できない
            this.work_str = this.work_str.replace(/<h(\d) id="([^"]+)">/g, '<h$1 id="$2" name="$2">');
        }
        applyKnownPhrase() {
            // 定型文の翻訳
            // foo, ba+r -> /<foo( [^>]*)?>ba+r</
            // TODO: URLを見て適用するルールを限定する？
            const patterns = [
                // common
                ['h2', 'Specifications', '仕様'],
                ['strong', 'Note:', '注:'],
                ['strong', 'Note', '注'],
                ['h2', 'Examples?', '例'],
                ['h2', 'Browser compatibility', 'ブラウザ実装状況'],
                ['h2', 'Notes', '注記'],
                ['h2', 'See also', '関連情報'],
                // common - compatibility table
                ['td', 'Basic support', '基本サポート'],
                ['th', 'Feature', '機能'],
                ['th', 'Specification', '仕様書'],
                ['th', 'Status', '策定状況'],
                ['th', 'Comment', 'コメント'],
                ['td', 'Initial (definition|specification)\.?', '初期定義'],
                // common - constant table
                ['th', 'Value', '値'],
                ['th', 'Associated constant', '定数'],
                ['th', 'Description', '説明'],
                // JavaScript API
                ['h2', 'Methods', 'メソッド'],
                ['h2', 'Properties', 'プロパティ'],
                ['h2', 'Syntax', '構文'],
                ['h3', 'Parameters', 'パラメータ'],
                // DOM Elements
                ['h3', 'Event handlers', 'イベントハンドラー'],
                // /docs/Web/HTML/Element
                // 要素には独自の用語・フレーズが多いので、後回し。
                // いくつかスクリプト最下部にコメントアウトで記載。
                ['h2', 'Attributes', '属性'],
                ['h2', 'Scripting', 'スクリプティング'],
                // Event reference /docs/Web/Events/
                ['h2', 'General info', '基本情報'],
                ['h2', 'Related Events', '関連するイベント'],
                ['dt', 'Specification', '仕様'],
                ['dt', 'Interface', 'インターフェイス'],
                ['dt', 'Bubbles', 'バブリング'],
                ['dt', 'Cancelable', 'キャンセル可能か'],
                ['dt', 'Target', 'ターゲット'],
                ['dt', 'Default Action', '既定の動作'],
                ['dd', 'None', 'なし']
            ];
            for (const pattern of patterns)
                this.work_str = this.work_str.replace(new RegExp(`(<${pattern[0]}(?: [^>]*)?>)${pattern[1]}<`, 'g'), `$1${pattern[2]}<`);
        }
        applyKnownSentence() {
            // doesn't (implement|inherit) 周りのemの入れ子が適当っぽいので勝手に正規化
            // ※ HTML的には em の入れ子にも意味があるらしいが、
            //     意味を持って使っているようには見えないし、手作業での翻訳でも多分意識してない...
            let count = 0;
            const tmp = this.work_str.replace(/<\/?em>/g, m => {
                const n = (m[1] === '/') ? -1 : 1;
                count += n;
                if (count === 1 && n === 1) return m;
                else if (count === 0 && n === -1) return m;
                else return '';
            });
            if (count === 0) this.work_str = tmp;
            else console.log(`開始・終了タグの数が合わないのでスキップ: ${count}`);
            this.work_str = this.work_str.replace('</em><em>', '').replace('</em>.</p>', '.</em></p>');

            this.work_str = this.work_str.replace(/The (.+) interface neither implements?, nor inherits? any (property|method)\./g,
                                                  (m, p1, p2) => `${p1} インターフェイスが実装・継承する${p2[0] === 'p' ? 'プロパティ': 'メソッド'}はありません。`);
            this.work_str = this.work_str.replace(/The (.+) interface doesn't inherit any (property|method)\./g,
                                                  (m, p1, p2) => `${p1} インターフェイスが継承する${p2[0] === 'p' ? 'プロパティ': 'メソッド'}はありません。`);
            this.work_str = this.work_str.replace(/The (.+) interface doesn't implement any (property|method)\./g,
                                                  (m, p1, p2) => `${p1} インターフェイスが実装する${p2[0] === 'p' ? 'プロパティ': 'メソッド'}はありません。`);
            this.work_str = this.work_str.replace(/Inherits (methods|properties) from its parent, (.+)\./g,
                                                  (m, p1, p2) => `親である ${p2} から${p2[0] === 'p' ? 'プロパティ': 'メソッド'}を継承します。`);

            this.work_str = this.work_str.replace(/The ([<>/\w]+) interface/, '$1 インターフェイス');
        }
        applyLocalizedUrl() {
            this.work_str = this.work_str.replace(/"\/en-US\/docs\//, '/ja/docs/');
        }
    }

    const Utils = {
        setLocalizationInProgressFlag(value) {
            $('[name="localization_tags"][value="inprogress"').prop('checked', value);
        },
        setEditorialReviewFlag(value) {
            $('[name="review_tags"][value="editorial"').prop('checked', value);
        },
        copyTags()
        {
            const $tag_anchors = $('.tags a');
            const $tagit_input = $('.tagit input');
            $tag_anchors.each((i,e) => $tagit_input.val(e.innerText).blur());
        }
    };

    if (location.pathname.endsWith('$translate')) {
        const processor = new BodyProcessor();
        processor.addNameAttribute();
        processor.applyKnownPhrase();
        processor.applyKnownSentence();
        processor.applyLocalizedUrl();
        processor.save();

        Utils.setLocalizationInProgressFlag(false);
        Utils.setEditorialReviewFlag(true);
        Utils.copyTags();

        $('#id_comment').val(`英語版 rev.${$('#id_based_on').val()} を翻訳`);
    }

    if (location.pathname.endsWith('$edit')) {
        // 原文にdiffが発生している場合のみ
        if ($('.revision-diff').length) {
            $('#id_comment').val(`英語版 rev.${$('#id_based_on').val()} を反映`);
        }
    }
})();
/*
Content categories	コンテンツカテゴリ
Permitted content	許可された内容
Tag omission	タグの省略
Permitted parents	許可された親要素
Permitted ARIA roles	許可された ARIA ロール
DOM interface	DOM インターフェイス

Any	全て
flow content	フローコンテンツ
palpable content	パルパブルコンテンツ
sectioning content	セクショニングコンテンツ
heading content	ヘディングコンテンツ
phrasing content	フレージングコンテンツ
embedded content	埋め込みコンテンツ
interactive content	インタラクティブコンテンツ
form-associated content	フォーム関連コンテンツ

None, both the starting and ending tag are mandatory.
不可。開始と終了タグの両方が必要。
None, it is an {{Glossary("empty element")}}.
なし。これは{{Glossary("empty element", "空要素")}}です。
Must have a start tag and must not have an end tag.
開始タグは必須。終了タグを記述してはならない。

This element includes the <a href="/en-US/docs/Web/HTML/Global_attributes">global attributes</a>.
この要素は<a href="/ja/docs/Web/HTML/Global_attributes">グローバル属性</a>および以下の属性をサポートしています。
*/
