<script>
	// Edge glow component for terminal aesthetic
</script>

<div class="edge-container">
	<div class="edge edge-top"></div>
	<div class="edge edge-bottom"></div>
	<div class="edge edge-left"></div>
	<div class="edge edge-right"></div>
</div>

<style>
	.edge-container {
		pointer-events: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 9999;
	}

	.edge {
		position: fixed;
		animation: edge-pulse 4s infinite;
	}

	.edge-top,
	.edge-bottom {
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(
			90deg,
			transparent,
			var(--moss-green),
			var(--moss-glow),
			var(--moss-green),
			transparent
		);
	}

	.edge-left,
	.edge-right {
		top: 0;
		bottom: 0;
		width: 2px;
		background: linear-gradient(
			180deg,
			transparent,
			var(--moss-green),
			var(--moss-glow),
			var(--moss-green),
			transparent
		);
	}

	.edge-top {
		top: 0;
		box-shadow:
			0 0 10px rgba(124, 184, 124, 0.5),
			0 0 20px rgba(124, 184, 124, 0.3),
			0 0 30px rgba(124, 184, 124, 0.1);
		animation-delay: 0s;
	}

	.edge-bottom {
		bottom: 0;
		box-shadow:
			0 0 10px rgba(124, 184, 124, 0.5),
			0 0 20px rgba(124, 184, 124, 0.3),
			0 0 30px rgba(124, 184, 124, 0.1);
		animation-delay: 1s;
	}

	.edge-left {
		left: 0;
		box-shadow:
			0 0 10px rgba(124, 184, 124, 0.5),
			0 0 20px rgba(124, 184, 124, 0.3),
			0 0 30px rgba(124, 184, 124, 0.1);
		animation-delay: 0.5s;
	}

	.edge-right {
		right: 0;
		box-shadow:
			0 0 10px rgba(124, 184, 124, 0.5),
			0 0 20px rgba(124, 184, 124, 0.3),
			0 0 30px rgba(124, 184, 124, 0.1);
		animation-delay: 1.5s;
	}

	@media (prefers-reduced-motion: reduce) {
		.edge {
			animation: none;
			opacity: 0.6;
		}
	}
</style>
