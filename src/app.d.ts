// See https://kit.svelte.dev/docs/types#app for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: { id: number; email: string; name: string } | null;
		}
		// interface PageData {}
		interface Platform {
			env: {
				DB: D1Database;
			};
			context: {
				waitUntil(promise: Promise<any>): void;
			};
			caches: CacheStorage & { default: Cache };
		}
	}
}

export {};
