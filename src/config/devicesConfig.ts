import type { DevicesConfig } from "@/types/devicesConfig";

/**
 * 设备展示页配置（展示与行为控制）。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /devices/ 跳转 404；
 * - categories：场景分类，数组顺序即筛选 Chips 顺序；
 * - disabledIds：可选被禁用的设备 ID 列表；
 * - 具体设备数据维护在 src/data/devices.ts 中。
 */
export const devicesConfig: DevicesConfig = {
	enable: true,
	categories: [
		{
			key: "desk",
			label: "Desk Setup",
			icon: "material-symbols:desktop-windows-outline-rounded",
			description: "Workstation & home office hardware",
		},
		{
			key: "mobile",
			label: "Mobile & EDC",
			icon: "material-symbols:phone-iphone",
			description: "Daily portable devices & smart gadgets",
		},
		{
			key: "audio",
			label: "Audio & Visual",
			icon: "material-symbols:headphones-rounded",
			description: "Headphones, speakers & monitoring gears",
		},
		{
			key: "peripheral",
			label: "Peripherals",
			icon: "material-symbols:keyboard-outline-rounded",
			description: "Keyboards, mice & desk accessories",
		},
	],
};
