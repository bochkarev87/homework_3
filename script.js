// ---------------------------------------------------------------------------
// HW3 — Collaborative Filtering core
//
// Missing-value strategy (see week3/readme.md section 6):
//
//   [x] weight similarity by the number of co-rated items
//
// Cosine similarity is computed only over co-rated entries (nothing is
// imputed), then multiplied by min(common, SHRINK) / SHRINK so that a
// similarity backed by 1-2 shared items cannot beat one backed by many.
// ---------------------------------------------------------------------------

const SHRINK = 50;          // number of co-rated items at which the weight reaches 1
const NEIGHBOURS = 20;      // N most similar users used by User-Based CF
const MIN_SUPPORT = 2;      // a candidate needs at least this many contributing neighbours

// Initialize the application when the window loads
window.onload = async function() {
    const userBased = document.getElementById('user-based-result');
    const itemBased = document.getElementById('item-based-result');

    try {
        userBased.innerHTML = '<p>Loading movie data...</p>';
        itemBased.innerHTML = '<p>Loading movie data...</p>';

        await loadData();

        populateUserDropdown();

        userBased.innerHTML = '<p>Data loaded. Select a user.</p>';
        itemBased.innerHTML = '<p>Data loaded. Select a user.</p>';
    } catch (error) {
        console.error('Initialization error:', error);
        // The error message is already shown by data.js
    }
};

// Populate the user dropdown with one option per user id found in u.data
function populateUserDropdown() {
    const selectElement = document.getElementById('user-select');

    // Clear existing options except the first placeholder
    while (selectElement.options.length > 1) {
        selectElement.remove(1);
    }

    for (let userId = 1; userId <= numUsers; userId++) {
        const option = document.createElement('option');
        option.value = userId;
        option.textContent = `User ${userId}`;
        selectElement.appendChild(option);
    }
}

// ---------------------------------------------------------------------------
// Cosine similarity between two rating vectors (user rows or movie columns).
// Only co-rated (non-zero in both) entries are used; result is weighted by
// the number of co-rated items. Returns 0 when there are no co-rated items.
// ---------------------------------------------------------------------------
function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0, common = 0;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== 0 && b[i] !== 0) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
            common++;
        }
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return (dot / denominator) * Math.min(common, SHRINK) / SHRINK;
}

// Column of the rating matrix for one movie (cached, because it is reused a lot)
const columnCache = new Map();
function getMovieColumn(movieId) {
    if (!columnCache.has(movieId)) {
        columnCache.set(movieId, ratingMatrix.map(row => row[movieId]));
    }
    return columnCache.get(movieId);
}

function movieTitle(movieId) {
    return movies[movieId - 1] && movies[movieId - 1].id === movieId
        ? movies[movieId - 1].title
        : (movies.find(m => m.id === movieId) || {}).title;
}

// ---------------------------------------------------------------------------
// User-Based CF: top-K recommendations as [{ title, score }], best first.
// ---------------------------------------------------------------------------
function getUserBasedRecommendations(activeUserId, topK = 5) {
    const active = ratingMatrix[activeUserId];

    // 1-2. similarity to every other user, keep N most similar with sim > 0
    const neighbours = [];
    for (let u = 1; u <= numUsers; u++) {
        if (u === activeUserId) continue;
        const sim = cosineSimilarity(active, ratingMatrix[u]);
        if (sim > 0) neighbours.push({ u, sim });
    }
    neighbours.sort((x, y) => y.sim - x.sim);
    const top = neighbours.slice(0, NEIGHBOURS);

    // 3. similarity-weighted average rating for each unrated movie
    const results = [];
    for (let m = 1; m <= numMovies; m++) {
        if (active[m] !== 0) continue;
        let num = 0, den = 0, support = 0;
        for (const { u, sim } of top) {
            const r = ratingMatrix[u][m];
            if (r !== 0) { num += sim * r; den += sim; support++; }
        }
        if (support >= MIN_SUPPORT && den > 0) {
            results.push({ title: movieTitle(m), score: num / den });
        }
    }

    // 4. sort and take the top K
    results.sort((x, y) => y.score - x.score);
    return results.slice(0, topK);
}

// ---------------------------------------------------------------------------
// Item-Based CF: top-K recommendations as [{ title, score }], best first.
// ---------------------------------------------------------------------------
function getItemBasedRecommendations(activeUserId, topK = 5) {
    const active = ratingMatrix[activeUserId];
    const ratedMovies = [];
    for (let m = 1; m <= numMovies; m++) if (active[m] !== 0) ratedMovies.push(m);

    const results = [];
    for (let m = 1; m <= numMovies; m++) {
        if (active[m] !== 0) continue;
        const candidate = getMovieColumn(m);
        let num = 0, den = 0, support = 0;
        // aggregate similarities to the movies the user has rated, weighted by the user's rating
        for (const j of ratedMovies) {
            const sim = cosineSimilarity(candidate, getMovieColumn(j));
            if (sim > 0) { num += sim * active[j]; den += sim; support++; }
        }
        if (support >= MIN_SUPPORT && den > 0) {
            results.push({ title: movieTitle(m), score: num / den });
        }
    }

    results.sort((x, y) => y.score - x.score);
    return results.slice(0, topK);
}

// Provided — read the selected user and render both recommendation lists
function getRecommendations() {
    const selectElement = document.getElementById('user-select');
    const userId = parseInt(selectElement.value, 10);

    if (isNaN(userId)) {
        renderList('user-based-result', [], 'Please select a user first.');
        renderList('item-based-result', [], 'Please select a user first.');
        return;
    }

    renderList('user-based-result', getUserBasedRecommendations(userId));
    renderList('item-based-result', getItemBasedRecommendations(userId));
}

// Provided — render a list of { title, score } into the given element
function renderList(elementId, items, message) {
    const el = document.getElementById(elementId);

    if (message) {
        el.innerHTML = `<p>${message}</p>`;
        return;
    }

    if (!items || items.length === 0) {
        el.innerHTML = '<p>No recommendations. (Implement the TODO above.)</p>';
        return;
    }

    const entries = items
        .map(item => `<li>${item.title} &mdash; ${Number(item.score).toFixed(3)}</li>`)
        .join('');
    el.innerHTML = `<ul>${entries}</ul>`;
}
