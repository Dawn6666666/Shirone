import { defineConfig } from "@playwright/test";

/**
 * 组件质量专项 — Playwright 配置
 * 说明：测试针对 Astro 开发服务器上的 atoms-*-test 页面（组件库验证页）。
 * 复用系统 Chrome（channel: chrome），避免额外下载浏览器。
 */
export default defineConfig({
	testDir: "./tests",
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL: "http://localhost:4321",
		channel: "chrome",
		viewport: { width: 1280, height: 900 },
		trace: "retain-on-failure",
	},
	webServer: {
		command: "pnpm astro dev --port 4321 --host",
		url: "http://localhost:4321",
		reuseExistingServer: true,
		timeout: 120_000,
	},
});