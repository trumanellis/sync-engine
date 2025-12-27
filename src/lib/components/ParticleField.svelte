<script>
	import { onMount } from 'svelte';

	// Respect reduced motion preference
	let particleCount = 20;

	onMount(() => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) {
			particleCount = 5;
		}
	});
</script>

<div class="particle-field">
	{#each Array(particleCount) as _, i}
		<div
			class="particle"
			style="left: {Math.random() * 100}%; animation-delay: {Math.random() * 15}s;"
		></div>
	{/each}
</div>

<style>
	.particle-field {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 1;
		overflow: hidden;
	}

	.particle {
		position: absolute;
		width: 2px;
		height: 2px;
		background: var(--moss-glow);
		border-radius: 50%;
		animation: float-particle 15s infinite linear;
		will-change: transform, opacity;
	}

	@media (prefers-reduced-motion: reduce) {
		.particle {
			animation: none;
			display: none;
		}
	}
</style>
