# homework_3

HW3. Business & Algorithmic Analysis
1. User-based vs. Item-based CF

Quality. User-based CF finds people with similar taste and borrows their ratings; item-based CF finds items that were rated similarly and uses the target user's own ratings of those items. Item similarities are usually more stable: an item collects ratings from many users and its "character" rarely changes, whereas a user's taste drifts and a user profile is short and noisy. Item-based CF therefore tends to give more accurate and more explainable predictions ("because you liked X") when users have few ratings. User-based CF gives more diverse / serendipitous results because neighbours can bring items the user has never seen anything similar to.

Efficiency depends on which side is larger. Similarity matrices cost O(U² · I) for users and O(I² · U) for items (less with sparsity).

If users >> items (e.g. a store with millions of customers and thousands of products), the item-item matrix is much smaller (I² vs U²), changes slowly and can be precomputed offline. Item-based wins.
If items >> users (e.g. a niche service or a large catalogue with a small user base), the user-user matrix is smaller and user-based is cheaper.
MovieLens 100k has 943 users and 1,682 items (~106 ratings per user, ~59 per item), so the sizes are comparable and either approach is cheap here; the choice is driven by quality, not cost.
2. Missing-value strategy trade-off
Strategy	Simplicity	Bias	Computing cost
Mean imputation (fill empty cells with user/item mean)	Very simple	High: the matrix is ~94% empty, so most "ratings" are fake; similarities get pulled towards the mean and everyone looks alike; popular-item mean dominates	Dense matrix: O(U·I) memory and slower similarity computation
Weighted by common ratings (use only co-rated items, shrink by number of common ratings) — used in the implementation	Simple	Low: no invented data; shrinkage min(n, 50)/50 penalises similarities supported by few items. Remaining bias: neighbours who rated the target item only	Cheap: sparse loops, only co-rated pairs
Matrix factorization (SVD/ALS, learns latent factors from observed ratings only)	Complex: hyper-parameters (factors, regularisation), training loop	Lowest on accuracy: generalises through latent factors, can predict even with no co-rated items	Expensive to train (iterative), cheap to predict; needs retraining

Summary: mean imputation = easiest but most biased; weighted co-rated = the best balance for a homework/web demo; matrix factorization = best quality on sparse data at the highest engineering and compute cost.

3. Cold start and sparsity

Why CF fails for new users/items. CF uses only the rating matrix. A new user has an empty row, so there is nothing to compare with other users (user-based) or no rated items to average over (item-based). A new item has an empty column, so no user has rated it and no item-item similarity exists. The model can only fall back to global/item/user means or non-CF signals (content features, popularity, onboarding questions) — the app does exactly this fallback and says so on screen.

Why similarity from few co-rated items is unreliable. With 1–3 common ratings, a similarity of 1.0 can come from pure coincidence (two users both gave a 5 to one blockbuster). The estimate has huge variance: too little evidence. Cosine/Pearson on 1 item is always ±1 or undefined. Remedies: require a minimum number of common items (MIN_COMMON), shrink similarity by the number of common ratings (SHRINK), and limit prediction to the top-K neighbours. With ~94% sparsity in MovieLens, most user pairs share very few items, so this matters a lot.
