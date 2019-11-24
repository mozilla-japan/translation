// ==UserScript==
// @name        MDN Translation Helper
// @description MDNで翻訳を行う際に自動で色々します。
// @namespace   https://github.com/mozilla-japan/translation/
// @author      unarist
// @version     0.4.8
// @downloadURL https://raw.githubusercontent.com/mozilla-japan/translation/master/MDN/TranslationHelper.user.js
// @supportURL  https://github.com/mozilla-japan/translation/issues
// @match       https://wiki.developer.mozilla.org/en-US/docs/*
// @match       https://wiki.developer.mozilla.org/en-US/Add-ons/*
// @match       https://wiki.developer.mozilla.org/en-US/Apps/*
// @match       https://wiki.developer.mozilla.org/ja/docs/*
// @match       https://wiki.developer.mozilla.org/ja/Add-ons/*
// @match       https://wiki.developer.mozilla.org/ja/Apps/*
// ==/UserScript==

// 機能プランについてはGithubのプロジェクトに移動した
// https://github.com/mozilla-japan/translation/projects/1

/** changelog **

0.3 (2017/02/25)
 addNameAttribute id属性が翻訳済みの場合はスキップ
 syncTags 既存のタグを全て削除するように（主に手動実行用）
 各種手動実行リンクを追加

0.4 (2018/03/21)
 左右の縦調整を実装

0.4.1 (2018/03/22)
 左右の縦バランス機能を改良
 自動翻訳/整形機能を改良

0.4.2 (2018/04/07)
 ページ最下部にもTranslationHelperボタン追加
 GreaseMonkey 対応

0.4.3 (2018/04/22)
 長音の自動修正(サーバ => サーバー など)
 表記ガイドラインの修正候補提案を追加

0.4.4 (2018/04/29)
 ページ内リンクのURL変換バグを修正(#276)

0.4.5 (2018/05/03)
 長音処理の追加、新規翻訳時の長音処理キャンセル(#266 #277)

0.4.6 (2018/08/15)
 リンクURL変換時に"が消えていたバグを修正
 見出し翻訳エントリの追加

0.4.7 (2018/8/22)
 "初期化"を実行した際に前後に余分な空白がついていたバグを修正
 本文のない見出し（ライブサンプル等）でname属性追加が機能していなかったのを修正 (mozilla-translations-ja 668)

0.4.8 (2018/8/23)
 name属性追加処理でゴミが入ることがあるのを修正 (0.4.7でのデグレ)

*/

(function() {
    'use strict';

    if (!document.getElementById('localize-document')) return;

    class BodyProcessor {
        constructor() {
            this.src_str = document.querySelector('.translate-source > textarea').textContent;
            this.editor = CKEDITOR.instances[Object.keys(CKEDITOR.instances)[0]];
            this.dest_str = this.editor.getData();
            this.work_str = this.dest_str;

        }
        save() {
            if (this.work_str.length == this.dest_str.length) {
                this.editor.showNotification('Translation Helper処理前後のエディターの文字数が同一です (処理されていない可能性があります)', 'warning');
            }
            this.editor.setData(this.work_str);
        }
        resetBody() {
            // title: 翻訳のリセット
            // desc: 現在の翻訳文を破棄し、最新の英語版から全文をコピーします。

            this.work_str = this.src_str;
        }
        addNameAttribute() {
            // title: name属性の追加（id属性対策）
            // desc: 見出し翻訳時にid属性が日本語にならないように、name属性を追加します。既に翻訳されているものは処理しません。

            //this.work_str = this.work_str.replace(/<h(\d) id="(\w+)">/g, '<h$1 id="$2" name="$2">');
            let processed = 0;
            let skipped = [];
            this.work_str = this.work_str.replace(/<h(\d) ([^ >]* +)?id="([^"]+)">/g, (src, lv, other, id) => {
                if (id.match(/[^A-Za-z0-9_\-–;'\.\(\)&]/)) {
                    console.log(`addNameAttribute: skipped ${src}`);
                    skipped.push(id + ' (&lt;h' + lv + '&gt;)');
                    return src;
                } else {
                    processed++;
                    return `<h${lv} ${other || ''}id="${id}" name="${id}">`;
                }
            });
            if (skipped.length) {
                this.editor.showNotification('以下の見出しは既にidが翻訳済みなどのため、name属性を追加しませんでした。<br>・' + skipped.join('<br>・'), 'warning');
            }
            this.editor.showNotification('name属性追加: ' + processed + " 件");
        }
        applyKnownPhrase() {
            // title: 見出し等の自動翻訳
            // desc: セクション見出しや表の行・列見出しなどの定型句を翻訳します

            // foo, ba+r -> /<foo( [^>]*)?>ba+r</
            // TODO: URLを見て適用するルールを限定する？
            const patterns = [
                // common
                ['h2', 'Specifications', '仕様'],
                ['strong', 'Note:', '注:'],
                ['strong', 'Note', '注'],
                ['h2', 'Examples?', '例'],
                ['h2', 'Browser compatibility', 'ブラウザー実装状況'],
                ['h2', 'Notes', '注記'],
                ['h2', 'See also', '関連情報'],
                ['th', 'Type', '型'],
                ['th', 'Example', '例'],
                ['th', 'Name', '名前'],
                ['th', 'Mandatory', '必須'],
                ['td', 'Yes', 'はい'],
                ['td', 'No', 'いいえ'],
                // common - タグ限定無しの変換
                ['', '[Ff]or example,?', '例えば、'],
                ['', 'programming language', 'プログラミング言語'],
                ['', '[Bb]y default', '既定では'],
                // common - 日本語表記の強制変換
                ['', 'インター?フェース', 'インターフェイス'],
                ['', 'インタフェイス', 'インターフェイス'],
                ['', 'コンマ', 'カンマ'],
                ['', 'ファイヤー?ウォール', 'ファイアウォール'],
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
                ['h3', 'Parameters', 'パラメーター'],
                ['h3', 'Constants', '定数'],
                ['h3', 'Exceptions', '例外'],
                // DOM Elements
                ['h3', 'Event handlers', 'イベントハンドラー'],
                // Learning Area
                ['h2', 'Active learning:', 'アクティブラーニング:'],  // 一般的な表現
                ['th', 'Prerequisites:', '前提条件:'],
                ['th', 'Objective:', '目的:'],
                ['h2', 'In this module', 'このモジュール内'],
                ['p', 'Environment variable:(.*)', '環境変数:$2'],  // プログラム依存なデータかも?
             　 // Glossary
                ['h2', 'Learn more', '関連項目'],
                ['h3', 'General knowledge', '一般知識'],
                ['h3', 'Technical reference', '技術リファレンス'],
                ['h3', 'Learn about it', 'これについて学習する'],
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
                if (pattern[0] === ''){
                  this.work_str = this.work_str.replace(new RegExp(`${pattern[1]}`, 'g'), `${pattern[2]}`);
                } else{
                  this.work_str = this.work_str.replace(new RegExp(`(<${pattern[0]}(?: [^>]*)?>)${pattern[1]}<`, 'g'), `$1${pattern[2]}<`);
                }
            this.editor.showNotification('見出し等の自動翻訳を行いました。');
        }
        applyKnownSentence() {
            // title: 定型文の自動翻訳（β）
            // desc: 文章の自動翻訳を行います。今のところ継承周りの文言や The ... interface -> ... インターフェイスぐらいしかありません。

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
            this.work_str = this.work_str.replace(/This is a (<a.+>)localizable property(<\/a>)\./, 'これは$1ローカライズ可能なプロパティ$2です。');
            this.work_str = this.work_str.replace(/[Ss]ee (<a.+>.+<\/a>) for details\./, '詳しくは $1を見てください。');
            this.work_str = this.work_str.replace(/\{\{[Ii]nterwiki\((.*)\)\}\} on Wikipedia/, 'Wikipedia の {{interwiki($1)}}');
            this.work_str = this.work_str.replace(/The ([<>/\w]+) interface/, '$1 インターフェイス');

            // 英語と日本語の境界にスペース追加
            this.work_str = this.work_str
                .replace(/(<code[^>]*>[a-zA-Z][a-zA-Z\.0-9%\(\) ]*<\/code>)([あ-んア-ン])/g, '$1 $2')
                .replace(/([あ-んア-ン])(<code[^>]*>[a-zA-Z][a-zA-Z\.0-9%\(\) ]*<\/code>)/g, '$1 $2')
                .replace(/([あ-んア-ン])((?:<[^>]*>){0,})([a-zA-Z0-9%]+)/g, '$1 $2$3')
                .replace(/([a-zA-Z0-9%]+)((?:<\/[^>]*>){0,})([あ-んア-ン])/g, '$1$2 $3')
                .replace(/([0-9]+)((?:<\/[^>]*>){0,})([個回])/g, '$1$2 $3')
                .replace(/([、。]) /g, '$1');    // 句読点の後の半角スペース除去

            this.editor.showNotification('定型文の自動翻訳を行いました。');
        }
        alllyEditGuideLine() {
            // title: 表記をガイドラインにあわせる
            // desc: 長音化や表記のゆれなどを L10nガイドライン(https://github.com/mozilla-japan/translation/wiki/L10N-Guideline)に準ずるようにします
            const longPatterns = [
                'サーバ',
                'ユーザ',
                'ブラウザ',
                'コンピュータ',
                'カレンダ',
                'プライバシ',
                'バイナリ',
                'メモリ',
                'マネージャ',
                'フィルタ',
                'デバッガ',
                'ディストリビュータ',
                'モニタ',
                'カウンタ',
                'フォルダ',
                /* '',
                '',
                '', */
                'イテレータ',
                'ジェネレータ',
                'ディレクトリ'
            ];
            // 長音化
            let wc = this.work_str.length;
            for (const pattern of longPatterns){
                this.work_str = this.work_str.replace(new RegExp(`${pattern}`, 'g'), `${pattern}ー`)
                    .replace(new RegExp(`${pattern}ーー`, 'g'), `${pattern}ー`);
            }
            this.editor.showNotification('長音化: ' + (this.work_str.length - wc) + '件');

            const shortPatterns = [
                'アクセシビリティ',
                'ポータビリティ',
                'プロパティ',
                'セキュリティ',
                'コミュニティ',
                'ハードウェア',
                'ソフトウェア',
                'プロキシ'
            ];
            // 長音廃止
            wc = this.work_str.length;
            for (const pattern of shortPatterns){
                this.work_str = this.work_str.replace(new RegExp(`${pattern}ー`, 'g'), `${pattern}`);
            }
            this.editor.showNotification('長音廃止: ' + (this.work_str.length - wc) + '件');

            const suggestPatterns = [
                ['下さい', 'ください'],
                ['出来る', 'できる'],
                ['出来ます', 'できます'],
                ['全て', 'すべて'],
                ['殆ど', 'ほとんど'],
                ['幾つか', 'いくつか'],
                ['更に', 'さらに'],
                ['稀に', 'まれに'],
                ['偶に', 'たまに'],
                ['直ぐに', 'すぐに'],
                ['毎に', 'ごとに'],
                ['但し', 'ただし'],
                ['然し', 'しかし'],
                ['或いは', 'あるいは'],
                ['又は', 'または'],
                ['及び', 'および'],
                ['且つ', 'かつ'],
                ['未だ', 'まだ'],
                ['於いて', 'おいて'],
                /*['', ''],
                ['', ''],
                ['', ''],
                ['', ''],
                ['', ''],*/
            ];
            let suggestions = [];
            for (const pattern of suggestPatterns){
                this.work_str = this.work_str.replace(new RegExp(`(....)(${pattern[0]})(....)`, 'g'), (src, pre, match, post) => {
                    suggestions.push(`修正候補: ${pre}${match}${post}<br>    => ${pre}${pattern[1]}${post}`);
                    return src;    // 変更はしない
                });
            }
            if (suggestions.length) {
                this.editor.showNotification('以下の表記を見直してください。<br>・' + suggestions.join('<br>・'), 'warning');
            }
        }
        applyLocalizedUrl() {
            // title: 記事URLを日本語版に修正
            // desc: /en-US/docs/ を /ja/docs/ などに置き換えます。
            const newStr = this.work_str.replace(/"\/en-US\//g, '"/ja/')
            .replace(/"\/ja\/\//g, '"/ja/')
            // .replace(/"\/en-US\/Add-ons\//g, '/ja/Add-ons/')
            // .replace(/"\/en-US\/Apps\//g, '/ja/Apps/')
            .replace(/developer\.mozilla\.org\/en-US\//g, 'developer.mozilla.org/ja/');
            this.editor.showNotification('記事URLを日本語版に修正: ' + Math.round((this.work_str.length - newStr.length) / 3) + " 件");
            this.work_str = newStr;
        }
    }

    const Util = {
        setLocalizationInProgressFlag(value) {
            document.querySelector('[name="localization_tags"][value="inprogress"').checked = value;
        },
        setEditorialReviewFlag(value) {
            document.querySelector('[name="review_tags"][value="editorial"').checked = value;
        },
        syncTags() {
            // 既存のタグをすべて削除
            $('.tagit-choice').remove();

            // 英語版記事のタグをすべて追加
            const $tag_anchors = $('.tags a');
            const $tagit_input = $('.tagit input');
            $tag_anchors.each((i,e) => $tagit_input.val(e.innerText).blur());
        },
        getBaseRevisionId() {
            return document.querySelector('#id_based_on').value;
        },
        setRevisionComment(str) {
            document.querySelector('#id_comment').value = str;
        },
        insertRevisionComment(insertion) {
            const elem = document.querySelector('#id_comment');
            const curtext = elem.value;
            const newpos = elem.selectionStart + insertion.length;
            elem.value = curtext.substr(0, elem.selectionStart) + insertion + curtext.substr(elem.selectionEnd);
            elem.setSelectionRange(newpos, newpos);
            elem.focus();
        },
        initBalance(){
            const elem = document.querySelector(".translate-rendered");
            const style = window.getComputedStyle(elem);
            const margin = style.paddingTop.replace(/(\d+)(\D+)/, '$1');
            console.log('init: ' + margin);
            sessionStorage.setItem('balance-left', margin);
            sessionStorage.setItem('balance-right', '0');
            sessionStorage.setItem('balance-left-init', margin);
        },
        resetBalance(){
            const leftMargin =  sessionStorage.getItem('balance-left-init');
            document.querySelector(".translate-rendered").style.paddingTop = leftMargin + 'px';
            document.querySelector(".guide-links").style.paddingTop = '0px';
            sessionStorage.setItem('balance-left', leftMargin);
            sessionStorage.setItem('balance-right', '0');
        },
        balance(isleft) {
            const storedName = isleft ? 'balance-left' : 'balance-right';
            let margin = sessionStorage.getItem( storedName );
            margin = 60 + parseInt(margin);
            const elem = isleft ?
                document.querySelector(".translate-rendered") :
                document.querySelector(".guide-links");
            elem.style.paddingTop = '' + margin + 'px';
            sessionStorage.setItem(storedName, margin);
        }
    };

    if (location.pathname.endsWith('$translate')) {
        const processor = new BodyProcessor();
        processor.addNameAttribute();
        processor.applyKnownPhrase();
        processor.applyKnownSentence();
        processor.applyLocalizedUrl();
        processor.save();

        Util.setLocalizationInProgressFlag(false);
        Util.setEditorialReviewFlag(true);
        Util.syncTags();

        Util.setRevisionComment(`英語版 rev.${Util.getBaseRevisionId()} を翻訳`);
    }

    if (location.pathname.endsWith('$edit')) {
        // 原文にdiffが発生している場合のみ
        if (document.querySelector('.revision-diff')) {
            Util.setRevisionComment(`英語版 rev.${Util.getBaseRevisionId()} を反映`);
        }
    }

    Util.initBalance();

    const defs = [{
        target: '.guide-links',
        prepend: ' • ',
        label: 'Translation Helper',
        desc: 'MDN Translation Helper による自動処理を適用します',
        action: () => {
            if (!confirm('以下の処理を適用します:\n・name属性の追加\n・見出し等の自動翻訳\n・定型文の自動翻訳\n・記事URLを日本語版に修正')) return;
            const processor = new BodyProcessor();
            processor.addNameAttribute();
            processor.applyKnownPhrase();
            processor.applyKnownSentence();
            processor.alllyEditGuideLine();
            processor.applyLocalizedUrl();
            processor.save();
        }
    }, {
        target: '.guide-links',
        prepend: ' • ',
        label: '初期化',
        desc: 'エディタの内容を最新の原文で置き換えます',
        action: () => {
            if (!confirm('エディタの内容を最新の原文で置き換えます。よろしいですか？')) return;
            const processor = new BodyProcessor();
            processor.resetBody();
            processor.save();
        }
    }, {
        target: '.guide-links',
        prepend: ' • ',
        label: '[↓]',
        desc: '翻訳文を下げます',
        action: () => { Util.balance(false); }
    }, {
        target: '.guide-links',
        prepend: ' ',
        label: '[-]',
        desc: '原文と翻訳文の位置をリセットします',
        action: () => { Util.resetBalance(); }
    }, {
        target: '.guide-links',
        prepend: ' ',
        label: '[↑]',
        desc: '原文を下げます',
        action: () => { Util.balance(true); }
    }, {
        target: '#page-tags > h3',
        append: ' ',
        label: '[↑]',
        desc: '原文を下げます',
        action: () => { Util.balance(true); }
    }, {
        target: '#page-tags > h3',
        append: ' ',
        label: '[-]',
        desc: '原文と翻訳文の位置をリセットします',
        action: () => { Util.resetBalance(); }
    }, {
        target: '#page-tags > h3',
        append: ' ',
        label: '[↓]',
        desc: '翻訳文を下げます',
        action: () => { Util.balance(false); }
     }, {
        target: '#page-tags > h3',
        append: ' ',
        label: '[Translation Helper]',
        desc: 'MDN Translation Helper による自動処理を適用します',
        action: () => {
            if (!confirm('以下の処理を適用します:\n・name属性の追加\n・見出し等の自動翻訳\n・定型文の自動翻訳\n・記事URLを日本語版に修正')) return;
            const processor = new BodyProcessor();
            processor.addNameAttribute();
            processor.applyKnownPhrase();
            processor.applyKnownSentence();
            processor.alllyEditGuideLine();
            processor.applyLocalizedUrl();
            processor.save();
        }
    }, {
        target: '#page-tags > h3',
        append: ' ',
        label: '[英語版のタグと揃える]',
        desc: '現在設定されているタグを全て削除し、英語版のタグをコピーします',
        action: () => confirm('現在設定されているタグは全て削除されます。よろしいですか？') && Util.syncTags()
    }, {
        target: '#page-comment > h3',
        append: ' ',
        label: '[英語版のリビジョン番号を挿入]',
        desc: '翻訳元である英語版のリビジョン番号を、カーソル位置に挿入します',
        action: () => Util.insertRevisionComment("rev." + Util.getBaseRevisionId())
    }];

    for (const def of defs) {
        const elem = Object.assign(document.createElement('a'), {
            href: 'javascript:void(0)',
            style: 'font-size: 1rem',
            title: def.desc,
            textContent: def.label,
            onclick: def.action
        });

        const targetElem = document.querySelector(def.target);
        if (def.append) {
            targetElem.appendChild(document.createTextNode(def.append));
            targetElem.appendChild(elem);
        } else {
            targetElem.insertBefore(document.createTextNode(def.prepend), targetElem.firstChild);
            targetElem.insertBefore(elem, targetElem.firstChild);
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
