<script>
	import { onMount } from 'svelte';

	let businesses = $state([]);
	let loading = $state(true);
	let error = $state(null);
	let searchTerm = $state('');
	let selectedCategory = $state('all');

	// פונקציית עזר להמרת קישורי גוגל דרייב לקישור תמונה ישיר
	const getDirectImageUrl = (url) => {
		if (!url) return '';

		// אם זה קישור של גוגל דרייב
		if (url.includes('drive.google.com') && url.includes('id=')) {
			const idMatch = url.match(/id=([^&]+)/);
			if (idMatch && idMatch[1]) {
				// המרה לפורמט uc?export=view שמציג את התמונה ישירות
				return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
			}
		}
		return url;
	};

	onMount(async () => {
		try {
			const response = await fetch('/api/businesses');
			if (!response.ok) throw new Error('Failed to fetch businesses');
			const rawData = await response.json();

			businesses = rawData.map((row) => {
				const findValue = (partialKey) => {
					const key = Object.keys(row).find((k) => k.includes(partialKey));
					return key ? row[key] : '';
				};

				// טיפול בתמונה - לפעמים יש כמה תמונות מופרדות בפסיק, ניקח את הראשונה
				let rawImage = row['הוסף תמונה לבאנר'] || '';
				if (rawImage.includes(',')) {
					rawImage = rawImage.split(',')[0].trim();
				}

				return {
					id: row.id,
					name: row['שם העסק או השירות '] || row['שם העסק'] || 'ללא שם',
					phone: row['טלפון '] || row['טלפון'] || '',
					category: row['קטגוריה'] || row['Category'] || 'כללי',

					// כאן אנחנו מפעילים את התיקון לקישור
					banner: getDirectImageUrl(rawImage),

					description: row['הערות'] || row['תיאור'] || '',
					discount: findValue('ההנחה הבלעדית'),
					salesArea: row['אזור מכירה ארצי (אנטרנטי). אם האיזור פרטי נא לפרט היכן'] || '',
					address: row['מיקום המפעל / חנות / מחסן'] || '',
					deliveries: row['שירות משלוחים'] || '',
					website: row['אתר'] || row['Website'] || ''
				};
			});
		} catch (err) {
			error = err.message;
		} finally {
			loading = false;
		}
	});

	const categories = $derived([
		'all',
		...new Set(businesses.map((b) => b.category).filter(Boolean))
	]);

	const filteredBusinesses = $derived(
		businesses.filter((business) => {
			const matchesSearch =
				searchTerm === '' ||
				Object.values(business).some((value) =>
					String(value).toLowerCase().includes(searchTerm.toLowerCase())
				);

			const matchesCategory = selectedCategory === 'all' || business.category === selectedCategory;

			return matchesSearch && matchesCategory;
		})
	);
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
	<!-- Header -->
	<header class="sticky top-0 z-10 bg-white/80 shadow-sm backdrop-blur-md">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<h1
				class="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-center text-4xl font-bold text-transparent"
			>
				מדריך העסקים שלנו
			</h1>
			<p class="mt-2 text-center text-gray-600">גלו עסקים מקומיים והטבות בלעדיות</p>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		{#if loading}
			<div class="flex min-h-[400px] items-center justify-center">
				<div class="text-center">
					<div
						class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"
					></div>
					<p class="mt-4 text-gray-600">טוען עסקים...</p>
				</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
				<p class="text-red-600">שגיאה בטעינת העסקים: {error}</p>
			</div>
		{:else}
			<!-- Filters -->
			<div class="mb-8 space-y-4">
				<div class="relative">
					<input
						type="text"
						bind:value={searchTerm}
						placeholder="חיפוש עסקים..."
						class="w-full rounded-xl border border-gray-200 px-4 py-3 pr-12 transition outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
					/>
					<svg
						class="absolute top-3.5 right-4 h-5 w-5 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>

				<div class="flex flex-wrap gap-2">
					{#each categories as category}
						<button
							onclick={() => (selectedCategory = category)}
							class="rounded-full px-4 py-2 transition {selectedCategory === category
								? 'bg-blue-500 text-white shadow-md'
								: 'bg-white text-gray-700 hover:bg-gray-100'}"
						>
							{category === 'all' ? 'הכל' : category}
						</button>
					{/each}
				</div>
			</div>

			<p class="mb-4 text-gray-600">נמצאו {filteredBusinesses.length} עסקים</p>

			<!-- Business cards grid -->
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each filteredBusinesses as business (business.id)}
					<div
						class="group flex flex-col overflow-hidden rounded-xl bg-white shadow-md transition-all duration-300 hover:shadow-xl"
					>
						<!-- Banner Image -->
						{#if business.banner}
							<div class="relative h-48 w-full overflow-hidden bg-gray-100">
								<img
									src={business.banner}
									alt={business.name}
									class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
									loading="lazy"
								/>
							</div>
						{:else}
							<div class="h-3 bg-gradient-to-r from-blue-500 to-purple-500"></div>
						{/if}

						<div class="flex flex-1 flex-col p-6">
							<!-- Header: Name & Category -->
							<div class="mb-4">
								<div class="flex items-start justify-between">
									<h3 class="text-xl font-bold text-gray-800 transition group-hover:text-blue-600">
										{business.name}
									</h3>
								</div>
								<span
									class="mt-1 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
								>
									{business.category}
								</span>
							</div>

							<!-- Discount -->
							{#if business.discount}
								<div class="mb-4 rounded-lg border border-green-100 bg-green-50 p-3">
									<div class="flex items-center gap-2 text-green-700">
										<svg
											class="h-5 w-5 flex-shrink-0"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
											/>
										</svg>
										<span class="text-sm font-bold">הטבה לחברים:</span>
									</div>
									<p class="mt-1 text-sm text-green-800">{business.discount}</p>
								</div>
							{/if}

							<!-- Description -->
							{#if business.description}
								<p class="mb-4 line-clamp-3 flex-grow text-sm text-gray-600">
									{business.description}
								</p>
							{/if}

							<!-- Info Grid -->
							<div class="mt-auto space-y-2 border-t pt-4 text-sm text-gray-600">
								{#if business.address || business.salesArea}
									<div class="flex items-start gap-2">
										<svg
											class="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
										<span>
											{business.address ? business.address : ''}
											{business.address && business.salesArea ? ' | ' : ''}
											{business.salesArea}
										</span>
									</div>
								{/if}

								{#if business.deliveries && business.deliveries !== 'לא'}
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
											/>
										</svg>
										<span>{business.deliveries}</span>
									</div>
								{/if}

								{#if business.phone}
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
											/>
										</svg>
										<a
											href="tel:{business.phone}"
											class="font-medium hover:text-blue-600 hover:underline"
										>
											{business.phone}
										</a>
									</div>
								{/if}

								{#if business.website}
									<div class="flex items-center gap-2">
										<svg
											class="h-4 w-4 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
											/>
										</svg>
										<a
											href={business.website}
											target="_blank"
											rel="noopener noreferrer"
											class="truncate hover:text-blue-600 hover:underline"
										>
											בקר באתר
										</a>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{:else}
					<div class="col-span-full text-center py-12">
						<p class="text-gray-500 text-lg">לא נמצאו עסקים התואמים לחיפוש</p>
					</div>
				{/each}
			</div>
		{/if}
	</main>

	<footer class="mt-16 border-t bg-gray-50 py-8">
		<div class="mx-auto max-w-7xl px-4 text-center text-gray-600">
			<p>
				רוצים להוסיף את העסק שלכם? <a
					href="https://forms.gle/2PcfNFmh4HfZfWhv6"
					target="_blank"
					class="text-blue-600 hover:underline">מלאו את הטופס</a
				>
			</p>
		</div>
	</footer>
</div>

<style>
	:global(body) {
		direction: rtl;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
