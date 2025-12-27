<script>
	import '../app.css';
	import EdgeGlow from '$lib/components/EdgeGlow.svelte';
	import ParticleField from '$lib/components/ParticleField.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>🌀 SyncEngine V2</title>
</svelte:head>

<EdgeGlow />
<ParticleField />

<div class="app-container">
	{@render children()}
</div>

<style>
	.app-container {
		position: relative;
		min-height: 100vh;
		z-index: 10;
	}
</style>
