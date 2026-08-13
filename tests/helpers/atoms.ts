import { expect, type Page } from "@playwright/test";

/**
 * 组件质量专项 — 断言助手
 * 以官方 md-comp-* token（research/material-web/tokens/versions/v0_192）为基准，
 * 通过 CSS 变量解析成最终计算值，再与元素 computed style 逐一比对。
 */

export async function openTestPage(page: Page, slug: string) {
	await page.goto(`/${slug}/`, { waitUntil: "domcontentloaded" });
	// 等待客户端主题引擎初始化（HCT 动态配色）
	// 等待客户端主题引擎初始化（HCT 动态配色把 --mc-* 写入 :root 内联样式）
	await page.waitForFunction(() => {
		const root = document.documentElement;
		return root.style.getPropertyValue("--mc-primary").trim().startsWith("#");
	});
	// 主题引擎应用后组件背景/文字色带 transition，等待过渡收敛到最终色
	await page.waitForTimeout(350);
}

/** 把 CSS 变量解析为该属性下的最终计算值（如 var(--primary) → rgb(...)） */
export function resolveVar(page: Page, cssProp: string, tokenVar: string): Promise<string> {
	return page.evaluate(
		([prop, varname]) => {
			const el = document.createElement("div");
			el.style.setProperty(prop, `var(${varname})`);
			document.body.appendChild(el);
			const cs = getComputedStyle(el);
			const v = cs.getPropertyValue(prop).trim();
			el.remove();
			return v;
		},
		[cssProp, tokenVar] as const,
	);
}

/** 断言元素某个样式属性 === token 解析后的计算值 */
export async function expectMatchesToken(
	page: Page,
	selector: string,
	cssProp: string,
	tokenVar: string,
	msg?: string,
) {
	const actual = await page.locator(selector).first().evaluate(
		(el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
		cssProp,
	);
	const expected = await resolveVar(page, cssProp, tokenVar);
	expect(actual, msg ?? `${selector} ${cssProp} 应等于 ${tokenVar}`).toBe(expected);
}

/** 断言元素某个样式属性等于字面值（非 token） */
export async function expectStyle(
	page: Page,
	selector: string,
	cssProp: string,
	expected: string,
	msg?: string,
) {
	const actual = await page.locator(selector).first().evaluate(
		(el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
		cssProp,
	);
	expect(actual, msg ?? `${selector} ${cssProp} 应为 ${expected}`).toBe(expected);
}

/** 读取元素 computed style 属性 */
export async function readStyle(page: Page, selector: string, cssProp: string): Promise<string> {
	return page.locator(selector).first().evaluate(
		(el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
		cssProp,
	);
}

/** 读取元素尺寸（含 padding/border 的盒模型外尺寸） */
export async function readBox(page: Page, selector: string) {
	return page.locator(selector).first().evaluate((el) => {
		const r = el.getBoundingClientRect();
		return { width: Math.round(r.width), height: Math.round(r.height) };
	});
}

/** 等待并断言元素不可见（opacity 0 / display none / 从 DOM 移除） */
export async function expectHidden(page: Page, selector: string) {
	await expect(page.locator(selector)).toBeHidden();
}
