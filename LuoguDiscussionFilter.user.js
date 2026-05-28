// ==UserScript==
// @name         Luogu Discussion Filter
// @namespace    https://www.luogu.com.cn/
// @version      1.0.0
// @description  在讨论区自动屏蔽包含指定关键词的评论
// @author       qinglin_zcr,ChatGPT
// @match        https://www.luogu.com.cn/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    /* =========================
       配置
    ========================= */

    const STORAGE_KEY = 'luogu_discuss_block_words';

    function getBlockWords() {
        return GM_getValue(STORAGE_KEY, []);
    }

    function setBlockWords(words) {
        GM_setValue(STORAGE_KEY, words);
    }

    /* =========================
       样式
    ========================= */

    GM_addStyle(`
    .lg-blockword-btn {
        margin-right: 10px;
        cursor: pointer;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        user-select: none;
    }

    .lg-blockword-btn:hover {
        background: rgba(0,0,0,0.08);
    }

    .lg-blockword-mask {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .lg-blockword-panel {
        width: 520px;
        max-width: 90vw;
        background: white;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 0 30px rgba(0,0,0,0.25);
    }

    .lg-blockword-title {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 16px;
    }

    .lg-blockword-desc {
        color: #666;
        margin-bottom: 10px;
    }

    .lg-blockword-textarea {
        width: 100%;
        height: 220px;
        resize: vertical;
        font-size: 14px;
        padding: 10px;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid #ccc;
        outline: none;
    }

    .lg-blockword-actions {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .lg-blockword-actions button {
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
    }

    .lg-blockword-save {
        background: #3498db;
        color: white;
    }

    .lg-blockword-cancel {
        background: #eee;
    }
    `);

    /* =========================
       UI
    ========================= */

    function createSettingsUI() {
        const mask = document.createElement('div');
        mask.className = 'lg-blockword-mask';

        const words = getBlockWords();

        mask.innerHTML = `
        <div class="lg-blockword-panel">
            <div class="lg-blockword-title">讨论区屏蔽词设置</div>

            <div class="lg-blockword-desc">
                每行一个关键词。<br>
                只要评论内容包含该字符串，就会自动删除对应 row。
            </div>

            <textarea class="lg-blockword-textarea">${words.join('\n')}</textarea>

            <div class="lg-blockword-actions">
                <button class="lg-blockword-cancel">取消</button>
                <button class="lg-blockword-save">保存</button>
            </div>
        </div>
        `;

        document.body.appendChild(mask);

        mask.querySelector('.lg-blockword-cancel').onclick = () => {
            mask.remove();
        };

        mask.onclick = (e) => {
            if (e.target === mask) {
                mask.remove();
            }
        };

        mask.querySelector('.lg-blockword-save').onclick = () => {
            const text = mask.querySelector('textarea').value;

            const words = text
                .split('\n')
                .map(s => s.trim())
                .filter(Boolean);

            setBlockWords(words);

            mask.remove();

            alert('保存成功');

            processAll();
        };
    }

    /* =========================
       添加按钮
    ========================= */

    function addSettingButton() {
        if (document.querySelector('.lg-blockword-btn')) return;

        const searchWrap =
            document.querySelector('.nav-search') ||
            document.querySelector('.search-wrap');

        if (!searchWrap) return;

        const btn = document.createElement('div');
        btn.className = 'lg-blockword-btn';
        btn.title = '屏蔽词设置';

        btn.innerHTML = `
        <svg viewBox="0 0 1024 1024" width="20" height="20">
            <path fill="currentColor"
            d="M512 640a128 128 0 1 0 0-256 128 128 0 0 0 0 256zm405.3-128c0-27.7-2.5-54.7-7.3-80.9l89.3-69.5-85.3-147.8-107.7 43.3a404.3 404.3 0 0 0-139.9-80.9L650.7 32H373.3l-15.7 144.2a404.3 404.3 0 0 0-139.9 80.9l-107.7-43.3-85.3 147.8 89.3 69.5A443.3 443.3 0 0 0 106.7 512c0 27.7 2.5 54.7 7.3 80.9l-89.3 69.5 85.3 147.8 107.7-43.3a404.3 404.3 0 0 0 139.9 80.9L373.3 992h277.4l15.7-144.2a404.3 404.3 0 0 0 139.9-80.9l107.7 43.3 85.3-147.8-89.3-69.5c4.8-26.2 7.3-53.2 7.3-80.9z"/>
        </svg>
        `;

        btn.onclick = createSettingsUI;

        searchWrap.parentNode.insertBefore(btn, searchWrap);
    }

    /* =========================
       屏蔽逻辑
    ========================= */

    function shouldBlock(text, words) {
        for (const word of words) {
            if (text.includes(word)) {
                return true;
            }
        }
        return false;
    }

    function processAll() {
        if (!location.href.startsWith('https://www.luogu.com.cn/discuss/')) {
            return;
        }

        const words = getBlockWords();

        if (!words.length) return;

        const markedList = document.querySelectorAll('.lfe-marked');

        markedList.forEach(marked => {

            const text = marked.innerText || '';

            if (!shouldBlock(text, words)) return;

            // 找到最外层 row
            const row = marked.closest('.row');

            if (row) {
                row.remove();
            }
        });
    }

    /* =========================
       监听动态加载
    ========================= */

    const observer = new MutationObserver(() => {
        addSettingButton();
        processAll();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    /* =========================
       启动
    ========================= */

    addSettingButton();
    processAll();

})();
