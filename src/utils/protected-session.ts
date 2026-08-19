import type { ProtectedSession } from "@/types/protectedContent";

const SESSION_PREFIX = "shirone:protected:v1:";
const SESSION_TTL = 30 * 60 * 1000;

type SessionMarker = {
	v: 1;
	scope: string;
	expiresAt: number;
};

const memory = new Map<string, ProtectedSession>();

function keyFor(scope: string): string {
	return `${SESSION_PREFIX}${encodeURIComponent(scope)}`;
}

function storage(): Storage | null {
	if (typeof window === "undefined") return null;
	try {
		return window.sessionStorage;
	} catch {
		return null;
	}
}

function validMarker(value: unknown, scope: string): value is SessionMarker {
	if (!value || typeof value !== "object") return false;
	const marker = value as Partial<SessionMarker>;
	return (
		marker.v === 1 &&
		marker.scope === scope &&
		typeof marker.expiresAt === "number" &&
		marker.expiresAt > Date.now()
	);
}

function validMemorySession(
	value: ProtectedSession | undefined,
	scope: string,
): value is ProtectedSession {
	return Boolean(
		value &&
		value.v === 1 &&
		value.scope === scope &&
		value.expiresAt > Date.now() &&
		typeof value.content === "string",
	);
}

export function readProtectedSession(scope: string): ProtectedSession | null {
	const cached = memory.get(scope);
	if (validMemorySession(cached, scope)) return cached;
	memory.delete(scope);

	const store = storage();
	if (!store) return null;
	try {
		const raw = store.getItem(keyFor(scope));
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!validMarker(parsed, scope)) {
			store.removeItem(keyFor(scope));
			return null;
		}
		// A marker cannot restore decrypted content after a reload. Keep no pseudo-session.
		store.removeItem(keyFor(scope));
		return null;
	} catch {
		store.removeItem(keyFor(scope));
		return null;
	}
}

export function writeProtectedSession(
	scope: string,
	content: string,
): ProtectedSession {
	const session: ProtectedSession = {
		v: 1,
		scope,
		content,
		expiresAt: Date.now() + SESSION_TTL,
	};
	memory.set(scope, session);

	const store = storage();
	const marker: SessionMarker = {
		v: 1,
		scope,
		expiresAt: session.expiresAt,
	};
	try {
		store?.setItem(keyFor(scope), JSON.stringify(marker));
	} catch {
		// Session storage can be unavailable or quota-limited; memory remains usable.
	}
	return session;
}

export function clearProtectedSession(scope: string): void {
	memory.delete(scope);
	try {
		storage()?.removeItem(keyFor(scope));
	} catch {
		// Ignore storage failures during cleanup.
	}
}

export function clearAllProtectedSessions(): void {
	memory.clear();
	const store = storage();
	if (!store) return;
	try {
		for (let index = store.length - 1; index >= 0; index -= 1) {
			const key = store.key(index);
			if (key?.startsWith(SESSION_PREFIX)) store.removeItem(key);
		}
	} catch {
		// Ignore storage failures during cleanup.
	}
}
