export function formatDateToYYYYMMDD(date: Date): string {
	return date.toISOString().substring(0, 10);
}

/** 动态流时间戳：YYYY-MM-DD HH:mm（本地时区，用于社交式短内容） */
export function formatDateToYYYYMMDDHHmm(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${formatDateToYYYYMMDD(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
