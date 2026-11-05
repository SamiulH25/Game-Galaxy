import type { IconName } from '$lib/components/icons';

export interface Toast {
	id: number;
	title: string;
	body?: string;
	icon?: IconName;
	tone?: 'default' | 'good' | 'bad' | 'achievement';
}

class ToastStore {
	list = $state<Toast[]>([]);
	private next = 1;

	push(toast: Omit<Toast, 'id'>, ms = 4500): number {
		const id = this.next++;
		this.list = [...this.list.slice(-3), { ...toast, id }];
		if (ms > 0) setTimeout(() => this.dismiss(id), ms);
		return id;
	}

	dismiss(id: number): void {
		this.list = this.list.filter((t) => t.id !== id);
	}
}

export const toasts = new ToastStore();
