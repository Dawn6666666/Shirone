import type { DevicesConfig } from "@/types/devicesConfig";

/**
 * 设备展示页配置。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /devices/ 跳转 404；
 * - categories：场景分类，数组顺序即筛选 Chips 顺序；
 * - items：设备清单，featured 用于标记主力推荐设备，单项可用 enable 独立关闭；
 * - image：建议放在 public 下并填写站内绝对路径；缺省时使用 icon 视觉形态。
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
	items: [
		{
			enable: true,
			id: "macbook-pro-16",
			name: 'MacBook Pro 16"',
			brand: "Apple",
			category: "desk",
			status: "active",
			specs: "M3 Max / 64GB / 2TB",
			description:
				"Primary workstation for development, design, and heavy rendering workloads.",
			icon: "material-symbols:laptop-mac-rounded",
			featured: true,
			year: "2024",
			link: "https://www.apple.com/macbook-pro/",
		},
		{
			enable: true,
			id: "iphone-16-pro",
			name: "iPhone 16 Pro",
			brand: "Apple",
			category: "mobile",
			status: "active",
			specs: "Natural Titanium / 256GB",
			description:
				"Daily driver smartphone with outstanding cameras and a smooth 120Hz ProMotion display.",
			icon: "material-symbols:phone-iphone",
			featured: true,
			year: "2024",
		},
		{
			enable: true,
			id: "sony-wh1000xm5",
			name: "Sony WH-1000XM5",
			brand: "Sony",
			category: "audio",
			status: "active",
			specs: "Silver / ANC / LDAC",
			description:
				"Industry-leading noise-canceling headphones for immersive coding sessions and travels.",
			icon: "material-symbols:headphones-rounded",
			year: "2023",
		},
		{
			enable: true,
			id: "custom-keyboard-75",
			name: "Custom 75% Mechanical Keyboard",
			brand: "Custom",
			category: "peripheral",
			status: "active",
			specs: "Anodized Aluminum / Linear Switches",
			description:
				"Custom gasket-mounted keyboard tuned for deep, quiet typing acoustics.",
			icon: "material-symbols:keyboard-outline-rounded",
			year: "2025",
		},
		{
			enable: true,
			id: "ipad-pro-11",
			name: 'iPad Pro 11"',
			brand: "Apple",
			category: "mobile",
			status: "backup",
			specs: "Space Gray / 128GB",
			description:
				"Secondary mobile screen and digital notepad for sketching ideas and reading papers.",
			icon: "material-symbols:tablet-mac-rounded",
			year: "2021",
		},
	],
};
