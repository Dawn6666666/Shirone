import type { SkillsConfig } from "@/types/skillsConfig";

/**
 * 技能页配置。
 * - enable：页面总开关；false 时导航入口同步隐藏，访问 /skills/ 跳转 404；
 * - categories：筛选分类，数组顺序即 chips 顺序；
 * - items：技能清单，category 引用分类 key，单项可用 enable 独立关闭；
 * - level：离散熟练度，不渲染为百分比，避免传达不存在的精确度。
 */
export const skillsConfig: SkillsConfig = {
	enable: true,
	categories: [
		{
			key: "frontend",
			label: "Frontend",
			icon: "material-symbols:web-rounded",
		},
		{
			key: "backend",
			label: "Backend",
			icon: "material-symbols:dns-rounded",
		},
		{
			key: "tooling",
			label: "Tooling",
			icon: "material-symbols:construction-rounded",
		},
	],
	items: [
		{
			enable: true,
			name: "JavaScript",
			description:
				"ES2020+ syntax, async plumbing, and event-driven browser code.",
			icon: "simple-icons:javascript",
			category: "frontend",
			level: "advanced",
		},
		{
			enable: true,
			name: "TypeScript",
			description: "Typed application code and maintainable contracts.",
			icon: "simple-icons:typescript",
			category: "frontend",
			level: "expert",
		},
		{
			enable: true,
			name: "Astro",
			description: "Content-focused sites with fast server-rendered output.",
			icon: "simple-icons:astro",
			category: "frontend",
			level: "advanced",
		},
		{
			enable: true,
			name: "Svelte",
			description: "Focused interactive islands and component systems.",
			icon: "simple-icons:svelte",
			category: "frontend",
			level: "advanced",
		},
		{
			enable: true,
			name: "React",
			description: "Composable component trees with hooks and client state.",
			icon: "simple-icons:react",
			category: "frontend",
			level: "intermediate",
		},
		{
			enable: true,
			name: "Vue",
			description:
				"Progressive component authoring for rapid single-page apps.",
			icon: "simple-icons:vuedotjs",
			category: "frontend",
			level: "intermediate",
		},
		{
			enable: true,
			name: "Tailwind CSS",
			description: "Utility-first styling for rapidly composed interfaces.",
			icon: "simple-icons:tailwindcss",
			category: "frontend",
			level: "advanced",
		},
		{
			enable: true,
			name: "Sass",
			description:
				"Nesting, variables, and mixins for maintainable stylesheets.",
			icon: "simple-icons:sass",
			category: "frontend",
			level: "intermediate",
		},
		{
			enable: true,
			name: "Node.js",
			description: "Build tooling, services, and content pipelines.",
			icon: "simple-icons:nodedotjs",
			category: "backend",
			level: "advanced",
		},
		{
			enable: true,
			name: "Python",
			description: "Scripting, data wrangling, and service automation.",
			icon: "simple-icons:python",
			category: "backend",
			level: "intermediate",
		},
		{
			enable: true,
			name: "Java",
			description: "Typed OO code for larger service and tooling layers.",
			icon: "simple-icons:openjdk",
			category: "backend",
			level: "intermediate",
		},
		{
			enable: true,
			name: "Go",
			description: "Concurrent services and small high-performance tools.",
			icon: "simple-icons:go",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "Rust",
			description: "Memory-safe systems code and performance-critical paths.",
			icon: "simple-icons:rust",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "C++",
			description: "Native modules and performance-sensitive components.",
			icon: "simple-icons:cplusplus",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "C",
			description: "Low-level systems work close to the runtime.",
			icon: "simple-icons:c",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "Kotlin",
			description: "Concise JVM/Android code with modern null safety.",
			icon: "simple-icons:kotlin",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "Swift",
			description: "Native Apple-platform code and small CLIs.",
			icon: "simple-icons:swift",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "Ruby",
			description: "Readable scripting and quick automation.",
			icon: "simple-icons:ruby",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "PHP",
			description: "Server-rendered web code and content platforms.",
			icon: "simple-icons:php",
			category: "backend",
			level: "beginner",
		},
		{
			enable: true,
			name: "PostgreSQL",
			description: "Relational data modeling and application queries.",
			icon: "simple-icons:postgresql",
			category: "backend",
			level: "intermediate",
		},
		{
			enable: true,
			name: "Playwright",
			description: "User-facing regression and accessibility testing.",
			icon: "simple-icons:playwright",
			category: "tooling",
			level: "advanced",
		},
	],
};
