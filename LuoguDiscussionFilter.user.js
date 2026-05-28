// ==UserScript==
// @name         Luogu Discussion Filter
// @namespace    https://www.luogu.com.cn/user/1022924
// @version      1.1.0
// @description  在讨论区自动屏蔽指定评论
// @author       qinglin_zcr
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

    const STORAGE_KEY = 'luogu_discussion_filter_rules';

    function getRules() {
        return GM_getValue(STORAGE_KEY, []);
    }

    function setRules(rules) {
        GM_setValue(STORAGE_KEY, rules);
    }

    /* =========================
       样式
    ========================= */

    GM_addStyle(`
    .lg-filter-btn {
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

    .lg-filter-btn:hover {
        background: rgba(0,0,0,0.08);
    }

    .lg-filter-mask {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .lg-filter-panel {
        width: 560px;
        max-width: 90vw;
        background: white;
        border-radius: 14px;
        padding: 20px;
        box-shadow: 0 0 30px rgba(0,0,0,0.25);
    }

    .lg-filter-title {
        font-size: 22px;
        font-weight: bold;
        margin-bottom: 16px;
    }

    .lg-filter-desc {
        color: #666;
        margin-bottom: 12px;
        line-height: 1.7;
    }

    .lg-filter-textarea {
        width: 100%;
        height: 260px;
        resize: vertical;
        font-size: 14px;
        padding: 10px;
        box-sizing: border-box;
        border-radius: 8px;
        border: 1px solid #ccc;
        outline: none;
        font-family: Consolas, monospace;
    }

    .lg-filter-actions {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
    }

    .lg-filter-actions button {
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
    }

    .lg-filter-save {
        background: #3498db;
        color: white;
    }

    .lg-filter-cancel {
        background: #eee;
    }
    `);

    /* =========================
       工具函数
    ========================= */

    function normalizeText(s) {
        return s
            .replace(/\s+/g, ' ')
            .trim();
    }

    function shouldBlock(text, rules) {

        const normalizedText = normalizeText(text);

        for (const rule of rules) {

            const value = normalizeText(rule.value);

            if (!value) continue;

            // 包含关键词
            if (rule.type === 'contains') {

                if (normalizedText.includes(value)) {
                    return true;
                }

            }

            // 完全匹配
            else if (rule.type === 'exact') {

                if (normalizedText === value) {
                    return true;
                }

            }
        }

        return false;
    }

    /* =========================
       设置 UI
    ========================= */

    function createSettingsUI() {

    const old = document.querySelector('.lg-filter-mask');

    if (old) {
        old.remove();
    }

    const mask = document.createElement('div');
    mask.className = 'lg-filter-mask';

    const rules = getRules();

    const exactText = rules
        .filter(rule => rule.type === 'exact')
        .map(rule => rule.value)
        .join('\n');

    const containsText = rules
        .filter(rule => rule.type === 'contains')
        .map(rule => rule.value)
        .join('\n');

    mask.innerHTML = `
    <div class="lg-filter-panel">

        <div class="lg-filter-title">
            Luogu Discussion Filter
        </div>

        <div style="margin-bottom: 8px; font-weight: bold;">
            完全匹配
        </div>

        <textarea
            class="lg-filter-textarea lg-filter-exact"
            style="height: 120px;"
            placeholder="每行一个完整评论"
        >${exactText}</textarea>

        <div style="
            margin-top: 18px;
            margin-bottom: 8px;
            font-weight: bold;
        ">
            关键词匹配
        </div>

        <textarea
            class="lg-filter-textarea lg-filter-contains"
            style="height: 120px;"
            placeholder="每行一个关键词"
        >${containsText}</textarea>

        <div class="lg-filter-actions">
            <button class="lg-filter-cancel">
                取消
            </button>

            <button class="lg-filter-save">
                保存
            </button>
        </div>

    </div>
    `;

    document.body.appendChild(mask);

    mask.onclick = (e) => {
        if (e.target === mask) {
            mask.remove();
        }
    };

    mask.querySelector('.lg-filter-cancel').onclick = () => {
        mask.remove();
    };

    mask.querySelector('.lg-filter-save').onclick = () => {

        const exactValue =
            mask.querySelector('.lg-filter-exact').value;

        const containsValue =
            mask.querySelector('.lg-filter-contains').value;

        const rules = [];

        // 完全匹配
        exactValue.split('\n').forEach(line => {

            line = line.trim();

            if (!line) return;

            rules.push({
                type: 'exact',
                value: line
            });

        });

        // 关键词匹配
        containsValue.split('\n').forEach(line => {

            line = line.trim();

            if (!line) return;

            rules.push({
                type: 'contains',
                value: line
            });

        });

        setRules(rules);

        mask.remove();

        processAll();

        alert('保存成功');
    };
}

    /* =========================
       添加设置按钮
    ========================= */

    function addSettingButton() {

        if (document.querySelector('.lg-filter-btn')) {
            return;
        }

        const searchWrap =
            document.querySelector('.nav-search') ||
            document.querySelector('.search-wrap');

        if (!searchWrap) return;

        const btn = document.createElement('div');

        btn.className = 'lg-filter-btn';

        btn.title = 'Discussion Filter';

        btn.innerHTML = `
<img
    src="https://cdn.luogu.com.cn/upload/image_hosting/soky5j65.png"
    style="
        width: 17px;
        height: 17px;
        object-fit: contain;
        pointer-events: none;
    "
>
`;

        btn.onclick = createSettingsUI;

        searchWrap.parentNode.insertBefore(btn, searchWrap);
    }

    /* =========================
       屏蔽逻辑
    ========================= */

    function processAll() {

        if (
            !location.href.startsWith(
                'https://www.luogu.com.cn/discuss/'
            )
        ) {
            return;
        }

        const rules = getRules();

        if (!rules.length) {
            return;
        }

        const markedList =
            document.querySelectorAll('.lfe-marked');

        markedList.forEach(marked => {

            const text = marked.innerText || '';

            if (!shouldBlock(text, rules)) {
                return;
            }

            // 删除最外层 row
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
