<script>
	import { onMount } from 'svelte';
	import { initializeApp, shutdownApp, getDatabases } from '$lib/app-init.js';
	import { createIntention } from '$lib/data-model.js';
	import { p2pStatus, peerId, orbitdbReady, userIdentity, intentions } from '$lib/stores.js';

	let newIntentionTitle = '';
	let newIntentionDescription = '';

	onMount(async () => {
		await initializeApp();

		return () => {
			shutdownApp();
		};
	});

	async function handleCreateIntention() {
		if (!newIntentionTitle.trim()) return;

		const databases = getDatabases();

		await createIntention(databases.intentions, {
			title: newIntentionTitle,
			description: newIntentionDescription,
			createdBy: $userIdentity.id,
			status: 'active',
			category: 'ask'
		});

		newIntentionTitle = '';
		newIntentionDescription = '';
	}
</script>

<div class="app">
	<header>
		<h1>🌀 SyncEngine V2</h1>
		<div class="status">
			<span class="status-indicator status-{$p2pStatus}"></span>
			<span>{$p2pStatus}</span>
		</div>
	</header>

	{#if $p2pStatus === 'connecting'}
		<div class="loading">
			<div class="spinner"></div>
			<p>Initializing P2P network...</p>
		</div>
	{:else if $orbitdbReady}
		<main>
			<section class="peer-info">
				<h2>Network Info</h2>
				<p><strong>Peer ID:</strong> <code>{$peerId?.slice(0, 16)}...</code></p>
				<p><strong>Identity:</strong> <code>{$userIdentity?.id?.slice(0, 40)}...</code></p>
			</section>

			<section class="create-intention">
				<h2>Create Intention</h2>
				<form on:submit|preventDefault={handleCreateIntention}>
					<input
						type="text"
						placeholder="I open myself to receive..."
						bind:value={newIntentionTitle}
						required
					/>
					<textarea
						placeholder="Description (optional)"
						bind:value={newIntentionDescription}
						rows="3"
					></textarea>
					<button type="submit">Create Intention</button>
				</form>
			</section>

			<section class="intentions-list">
				<h2>Active Intentions ({$intentions.length})</h2>
				{#if $intentions.length === 0}
					<p class="empty">No intentions yet. Create one above!</p>
				{:else}
					<div class="intentions-grid">
						{#each $intentions as intention (intention.intentionId)}
							<article class="intention-card">
								<h3>{intention.title}</h3>
								{#if intention.description}
									<p>{intention.description}</p>
								{/if}
								<footer>
									<span class="category">{intention.category}</span>
									<span class="author">by {intention.createdBy.slice(0, 16)}...</span>
								</footer>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</main>
	{/if}
</div>

<style>
	/* Use the design system from app.css */
	.app {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--moss-green);
	}

	h1 {
		font-family: var(--font-serif);
		font-size: var(--font-size-2xl);
		color: var(--white);
		animation: logo-glow 6s infinite;
	}

	.status {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-mono);
		color: var(--gray-light);
	}

	.status-indicator {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		animation: status-pulse 3s infinite;
	}

	.status-connecting {
		background: var(--gold);
		box-shadow: var(--shadow-gold-sm);
	}
	.status-connected {
		background: var(--neon-green);
		box-shadow: 0 0 10px rgba(57, 255, 20, 0.5);
	}
	.status-disconnected {
		background: var(--red);
		box-shadow: 0 0 10px rgba(255, 51, 102, 0.5);
	}

	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 4rem;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--moss-green);
		border-top-color: var(--neon-green);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	section {
		margin-bottom: var(--space-2xl);
		padding: var(--space-xl);
		border: 1px solid var(--moss-green);
		border-radius: var(--radius-lg);
		background: rgba(20, 20, 20, 0.8);
		transition: all var(--transition-base);
	}

	section:hover {
		border-color: var(--moss-glow);
		box-shadow: var(--shadow-md);
	}

	h2 {
		font-family: var(--font-serif);
		color: var(--gold);
		margin-bottom: var(--space-md);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	input,
	textarea {
		padding: 0.75rem;
		background: transparent;
		border: 1px solid var(--moss-green);
		border-radius: var(--radius-md);
		color: var(--white);
		font-family: var(--font-mono);
		transition: all var(--transition-base);
	}

	input::placeholder,
	textarea::placeholder {
		color: rgba(245, 245, 245, 0.3);
		font-style: italic;
	}

	input:focus,
	textarea:focus {
		outline: none;
		border-color: var(--moss-glow);
		box-shadow: 0 0 15px rgba(124, 184, 124, 0.3);
	}

	button {
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		border: 1px solid var(--moss-green);
		border-radius: var(--radius-md);
		color: var(--moss-glow);
		font-family: var(--font-mono);
		cursor: pointer;
		transition: all var(--transition-base);
		min-height: var(--touch-target-min);
	}

	button:hover {
		border-color: var(--neon-green);
		color: var(--neon-green);
		box-shadow: 0 0 15px rgba(57, 255, 20, 0.3);
	}

	button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.intentions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.intention-card {
		padding: var(--space-xl);
		background: rgba(20, 20, 20, 0.8);
		border: 1px solid var(--moss-green);
		border-radius: var(--radius-lg);
		transition: all var(--transition-base);
	}

	.intention-card:hover {
		border-color: var(--moss-glow);
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
	}

	.intention-card h3 {
		font-family: var(--font-serif);
		color: var(--white);
		margin-bottom: var(--space-sm);
	}

	.intention-card p {
		color: var(--gray-light);
		margin-bottom: var(--space-md);
	}

	.intention-card footer {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-sm);
		color: var(--moss-glow);
	}

	.category {
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.empty {
		color: var(--gray-dim);
		text-align: center;
		padding: var(--space-2xl);
		font-style: italic;
	}
</style>
