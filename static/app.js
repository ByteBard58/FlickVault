// FlickVault - Frontend Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // --- App State ---
  const state = {
    items: [],
    currentTab: 'all', // 'all', 'watchlist', 'watched', 'add'
    searchQuery: '',
    filterYear: '',
    sortBy: 'newest',
    authReady: false,
  };

  let authConfig = null;
  let supabaseClient = null;
  let currentSession = null;

  // --- Element Selectors ---
  const tabButtons = document.querySelectorAll('.tab-btn');
  const vaultShells = document.querySelectorAll('.vault-shell');
  const authPanel = document.getElementById('auth-panel');
  const authForm = document.getElementById('auth-form');
  const authEmail = document.getElementById('auth-email');
  const authPassword = document.getElementById('auth-password');
  const signUpBtn = document.getElementById('sign-up-btn');
  const signOutBtn = document.getElementById('sign-out-btn');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  const accountActionGroup = document.getElementById('account-action-group');
  const userEmail = document.getElementById('user-email');
  const panels = {
    list: document.getElementById('panel-list'),
    add: document.getElementById('panel-add'),
  };
  const mediaGrid = document.getElementById('media-grid');
  const emptyState = document.getElementById('empty-state');
  const emptyAddBtn = document.getElementById('empty-add-btn');
  
  // Controls
  const searchInput = document.getElementById('search-input');
  const filterYearSelect = document.getElementById('filter-year');
  const sortBySelect = document.getElementById('sort-by');
  const clearFiltersBtn = document.getElementById('clear-filters');
  
  // Dashboard Stats
  const statTotal = document.getElementById('stat-total');
  const statWatched = document.getElementById('stat-watched');
  const statRating = document.getElementById('stat-rating');
  const statCompletion = document.getElementById('stat-completion');
  const statProgressBar = document.getElementById('stat-progress-bar');
  
  // Add Media Form & Elements
  const addForm = document.getElementById('add-media-form');
  const addImdbId = document.getElementById('add-imdb-id');
  const addTitle = document.getElementById('add-title');
  const addYear = document.getElementById('add-year');
  const addIsTv = document.getElementById('add-is-tv');
  const groupEndYear = document.getElementById('group-end-year');
  const addEndYear = document.getElementById('add-end-year');
  const addPosterUrl = document.getElementById('add-poster-url');
  const addWatched = document.getElementById('add-watched');
  const watchedFields = document.getElementById('watched-fields');
  const addRating = document.getElementById('add-rating');
  const addComment = document.getElementById('add-comment');
  const addResetBtn = document.getElementById('add-reset-btn');
  
  // Add Preview Card Elements
  const previewCard = document.getElementById('live-preview-card');
  const previewPoster = document.getElementById('preview-poster');
  const previewRatingContainer = document.getElementById('preview-rating-container');
  const previewRating = document.getElementById('preview-rating');
  const previewWatchedBadge = document.getElementById('preview-watched-badge');
  const previewYear = document.getElementById('preview-year');
  const previewTypeTag = document.getElementById('preview-type-tag');
  const previewTitle = document.getElementById('preview-title');
  const previewComment = document.getElementById('preview-comment');
  
  // Modals & Forms
  const editDialog = document.getElementById('edit-dialog');
  const editForm = document.getElementById('edit-media-form');
  const editImdbId = document.getElementById('edit-imdb-id');
  const editImdbIdDisplay = document.getElementById('edit-imdb-id-display');
  const editTitle = document.getElementById('edit-title');
  const editYear = document.getElementById('edit-year');
  const editIsTv = document.getElementById('edit-is-tv');
  const editGroupEndYear = document.getElementById('edit-group-end-year');
  const editEndYear = document.getElementById('edit-end-year');
  const editPosterUrl = document.getElementById('edit-poster-url');
  const editWatched = document.getElementById('edit-watched');
  const editWatchedFields = document.getElementById('edit-watched-fields');
  const editRating = document.getElementById('edit-rating');
  const editComment = document.getElementById('edit-comment');
  const closeEditModal = document.getElementById('close-edit-modal');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  
  const deleteDialog = document.getElementById('delete-dialog');
  const deleteMediaTitle = document.getElementById('delete-media-title');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const closeDeleteModal = document.getElementById('close-delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

  const passwordDialog = document.getElementById('password-dialog');
  const passwordDialogBackdrop = document.getElementById('password-dialog-backdrop');
  const passwordForm = document.getElementById('password-form');
  const accountPasswordInput = document.getElementById('account-password');
  const closePasswordModal = document.getElementById('close-password-modal');
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');

  const deleteAccountDialog = document.getElementById('delete-account-dialog');
  const deleteAccountDialogBackdrop = document.getElementById('delete-account-dialog-backdrop');
  const confirmAccountDeleteBtn = document.getElementById('confirm-account-delete-btn');
  const closeAccountDeleteModal = document.getElementById('close-account-delete-modal');
  const cancelAccountDeleteBtn = document.getElementById('cancel-account-delete-btn');
  
  const toastContainer = document.getElementById('toast-container');

  let activeDeleteImdbId = null;

  // --- Authentication ---
  async function loadAuthConfig() {
    const response = await fetch('/config');
    if (!response.ok) throw new Error('Failed to load authentication config.');
    authConfig = await response.json();

    if (!authConfig.auth_enabled) {
      state.authReady = true;
      showVault();
      return;
    }

    if (!window.APP_CONFIG?.supabase_url || !window.APP_CONFIG?.supabase_anon_key) {
      throw new Error('Supabase is not configured in the client application.');
    }

    supabaseClient = window.supabase.createClient(
      window.APP_CONFIG.supabase_url,
      window.APP_CONFIG.supabase_anon_key
    );

    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    currentSession = data.session;

    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentSession = session;
      applyAuthState();
      if (session) fetchAllItems();
    });

    applyAuthState();
  }

  function applyAuthState() {
    const signedIn = Boolean(currentSession);
    state.authReady = signedIn;

    if (signedIn) {
      userEmail.textContent = currentSession.user?.email || '';
      userEmail.classList.remove('hidden');
      signOutBtn.classList.remove('hidden');
      accountActionGroup.classList.remove('hidden');
      showVault();
    } else {
      state.items = [];
      userEmail.classList.add('hidden');
      signOutBtn.classList.add('hidden');
      accountActionGroup.classList.add('hidden');
      hideVault();
    }
  }

  function showVault() {
    authPanel.classList.add('hidden');
    vaultShells.forEach(el => el.classList.remove('hidden'));
  }

  function hideVault() {
    authPanel.classList.remove('hidden');
    vaultShells.forEach(el => el.classList.add('hidden'));
  }

  async function getAccessToken() {
    if (!authConfig?.auth_enabled) return null;
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    currentSession = data.session;
    return currentSession?.access_token || null;
  }

  async function apiFetch(url, options = {}) {
    const token = await getAccessToken();
    const headers = new Headers(options.headers || {});

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  }

  async function parseApiResponse(response, fallbackMessage) {
    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
    }

    if (!response.ok) {
      const message = data?.detail || data?.error || data?.message || fallbackMessage;
      throw new Error(message);
    }

    return data || {};
  }

  async function handleSignIn(e) {
    e.preventDefault();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast('Signed in successfully.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleSignUp() {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    try {
      const { error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      showToast('Account created. Check your email if confirmation is enabled.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleSignOut() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      showToast('Signed out.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function openPasswordDialog() {
    if (!passwordDialog) return;
    accountPasswordInput.value = '';
    clearValidationErrors(passwordForm);
    passwordDialog.showModal();
    if (passwordDialogBackdrop) passwordDialogBackdrop.setAttribute('data-open', 'true');
    lucide.createIcons();
  }

  function openDeleteAccountDialog() {
    if (!deleteAccountDialog) return;
    clearValidationErrors(passwordForm);
    deleteAccountDialog.showModal();
    if (deleteAccountDialogBackdrop) deleteAccountDialogBackdrop.setAttribute('data-open', 'true');
    lucide.createIcons();
  }

  function closePasswordDialog() {
    passwordDialog.close();
    if (passwordDialogBackdrop) passwordDialogBackdrop.setAttribute('data-open', 'false');
  }

  function closeDeleteAccountDialog() {
    deleteAccountDialog.close();
    if (deleteAccountDialogBackdrop) deleteAccountDialogBackdrop.setAttribute('data-open', 'false');
  }

  // Backdrop click to close
  if (passwordDialogBackdrop) {
    passwordDialogBackdrop.addEventListener('click', closePasswordDialog);
  }
  if (deleteAccountDialogBackdrop) {
    deleteAccountDialogBackdrop.addEventListener('click', closeDeleteAccountDialog);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    const newPassword = accountPasswordInput.value.trim();

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      if (authConfig?.auth_enabled && supabaseClient) {
        const { data, error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) throw error;
      } else {
        const response = await apiFetch('/account/password', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: newPassword }),
        });

        if (!response.ok) {
          const text = await response.text();
          let message = text || 'Unable to update password.';
          try {
            const json = JSON.parse(text);
            message = json.detail || json.error || json.message || message;
          } catch {
            // ignore non-JSON error response
          }
          throw new Error(message);
        }
      }

      closePasswordDialog();
      showToast('Password updated successfully.', 'success');
    } catch (error) {
      showToast(error?.message || String(error) || 'Unable to update password.', 'error');
    }
  }

  async function handleDeleteAccount() {
    try {
      const response = await apiFetch('/account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Unable to delete account.');
      }

      closeDeleteAccountDialog();
      await handleSignOut();
      showToast('Account deleted successfully.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  // --- API Fetch Functions ---
  async function fetchAllItems() {
    if (!state.authReady) return;
    showLoader();
    try {
      // Hitting search with no queries returns all items in the db
      const response = await apiFetch('/search');
      if (response.status === 404) {
        state.items = [];
        render();
        return;
      }
      const data = await parseApiResponse(response, 'Failed to load items.');
      state.items = data.items || [];
      render();
    } catch (error) {
      showToast(error.message, 'error');
      state.items = [];
      render();
    }
  }

  // --- Core Actions (Add, Update, Delete) ---
  async function handleAddSubmit(e) {
    e.preventDefault();
    if (!validateForm(addForm)) return;

    // Build Payload
    const posterUrls = addPosterUrl.value.trim() ? [addPosterUrl.value.trim()] : null;
    const isWatched = addWatched.checked;
    
    const payload = {
      imdb_id: addImdbId.value.trim(),
      title: addTitle.value.trim(),
      year: parseInt(addYear.value),
      end_year: addIsTv.checked && addEndYear.value ? parseInt(addEndYear.value) : null,
      poster_url: posterUrls,
      watched: isWatched,
      rating: isWatched && addRating.value ? parseFloat(addRating.value) : null,
      comment: isWatched && addComment.value.trim() ? addComment.value.trim() : null
    };

    try {
      const response = await apiFetch('/add_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await parseApiResponse(response, 'Failed to add media to the vault.');

      showToast(`Successfully added "${payload.title}"!`, 'success');
      resetAddForm();
      switchTab('all');
      await fetchAllItems();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!validateForm(editForm)) return;

    const imdbId = editImdbId.value;
    const isWatched = editWatched.checked;
    const posterUrls = editPosterUrl.value.trim() ? [editPosterUrl.value.trim()] : null;

    const payload = {
      title: editTitle.value.trim(),
      year: parseInt(editYear.value),
      end_year: editIsTv.checked && editEndYear.value ? parseInt(editEndYear.value) : null,
      poster_url: posterUrls,
      watched: isWatched,
      rating: isWatched && editRating.value ? parseFloat(editRating.value) : null,
      comment: isWatched && editComment.value.trim() ? editComment.value.trim() : null
    };

    try {
      const response = await apiFetch(`/update_item/${imdbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      await parseApiResponse(response, 'Failed to update media.');

      showToast(`Successfully updated "${payload.title}"!`, 'success');
      editDialog.close();
      await fetchAllItems();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function handleDeleteConfirm() {
    if (!activeDeleteImdbId) return;

    try {
      const response = await apiFetch(`/delete_item/${activeDeleteImdbId}`, {
        method: 'DELETE'
      });

      await parseApiResponse(response, 'Failed to delete media.');

      showToast('Media successfully deleted from vault.', 'success');
      deleteDialog.close();
      activeDeleteImdbId = null;
      await fetchAllItems();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function quickToggleWatched(imdbId, title) {
    // Standard quick "Mark as Watched" sets watched=true, but since rating/comment are optional, we can just save it with no rating/comment
    try {
      const response = await apiFetch(`/update_item/${imdbId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watched: true })
      });

      if (!response.ok) {
        await parseApiResponse(response, 'Failed to update watched status.');
      }

      showToast(`Marked "${title}" as watched!`, 'success');
      await fetchAllItems();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  // --- UI Operations & Renderers ---
  function render() {
    const filtered = getFilteredAndSortedItems();
    renderStats();
    populateYearFilterDropdown();
    
    // Check if showing empty state
    if (filtered.length === 0) {
      mediaGrid.innerHTML = '';
      emptyState.classList.remove('hidden');
      
      // Customize empty message based on active tab/filters
      const emptyTitle = emptyState.querySelector('h3');
      const emptyDesc = emptyState.querySelector('p');
      
      if (state.searchQuery || state.filterYear) {
        emptyTitle.textContent = 'No matching media';
        emptyDesc.textContent = 'Try adjusting your search terms or filters.';
        emptyAddBtn.classList.add('hidden');
      } else if (state.currentTab === 'watchlist') {
        emptyTitle.textContent = 'Your watchlist is empty';
        emptyDesc.textContent = 'Explore your vault or add a new film/show to watch!';
        emptyAddBtn.classList.add('hidden');
      } else if (state.currentTab === 'watched') {
        emptyTitle.textContent = 'No watched media yet';
        emptyDesc.textContent = 'Chronicle your watch list and mark items as watched to see them here!';
        emptyAddBtn.classList.add('hidden');
      } else {
        emptyTitle.textContent = 'Vault is empty';
        emptyDesc.textContent = 'Start your ultimate media collection today by logging your first item!';
        emptyAddBtn.classList.remove('hidden');
      }
    } else {
      emptyState.classList.add('hidden');
      renderGrid(filtered);
    }
  }

  function renderGrid(itemsList) {
    mediaGrid.innerHTML = '';
    
    itemsList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'media-card glass-panel';
      
      // Handle poster URL
      const posterSrc = (item.poster_url && item.poster_url.length > 0) 
        ? item.poster_url[0] 
        : 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop';
        
      const ratingMarkup = item.watched && item.rating !== null
        ? `<div class="card-rating-badge"><i data-lucide="star"></i> ${item.rating.toFixed(1)}</div>`
        : '';
        
      const watchBadge = item.watched 
        ? `<span class="media-badge badge-watched">Watched</span>`
        : `<span class="media-badge badge-unwatched">Watchlist</span>`;
        
      const typeTag = item.end_year 
        ? `<span class="card-type-tag">TV Show (${item.year}-${item.end_year})</span>`
        : `<span class="card-type-tag">Movie</span>`;
        
      const commentMarkup = item.watched && item.comment 
        ? `<p class="card-comment" title="${escapeHtml(item.comment)}">"${escapeHtml(item.comment)}"</p>`
        : `<p class="card-comment text-muted italic">No comments recorded.</p>`;

      const quickWatchButton = !item.watched 
        ? `<button class="quick-watched-btn" data-imdb="${item.imdb_id}" data-title="${escapeHtml(item.title)}">
             Watched
           </button>`
        : '';
        
      card.innerHTML = `
        <div class="card-poster">
          <img src="${posterSrc}" alt="${escapeHtml(item.title)}" onerror="this.src='https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop'">
          ${ratingMarkup}
          ${watchBadge}
        </div>
        <div class="card-details">
          <div class="card-meta">
            <span class="card-year">${item.year}</span>
            ${typeTag}
          </div>
          <h3 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h3>
          ${commentMarkup}
          <div class="card-actions">
            <a href="${item.imdb_link || 'https://www.imdb.com/title/' + item.imdb_id}" target="_blank" class="imdb-pill">
              <i data-lucide="external-link"></i> IMDb
            </a>
            <div class="card-ops">
              ${quickWatchButton}
              <button class="op-btn op-btn-edit" title="Edit" data-imdb="${item.imdb_id}">
                <i data-lucide="edit-3"></i>
              </button>
              <button class="op-btn op-btn-delete" title="Delete" data-imdb="${item.imdb_id}" data-title="${escapeHtml(item.title)}">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      
      mediaGrid.appendChild(card);
    });

    // Wire operations buttons in grid
    mediaGrid.querySelectorAll('.quick-watched-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        quickToggleWatched(btn.dataset.imdb, btn.dataset.title);
      });
    });
    
    mediaGrid.querySelectorAll('.op-btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditDialog(btn.dataset.imdb);
      });
    });
    
    mediaGrid.querySelectorAll('.op-btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDeleteDialog(btn.dataset.imdb, btn.dataset.title);
      });
    });

    lucide.createIcons();
  }

  function renderStats() {
    const total = state.items.length;
    const watchedList = state.items.filter(item => item.watched);
    const watchedCount = watchedList.length;
    
    // Avg Rating
    let avg = 0.0;
    if (watchedCount > 0) {
      const sum = watchedList.reduce((acc, item) => acc + (item.rating || 0), 0);
      avg = sum / watchedCount;
    }

    statTotal.textContent = total;
    statWatched.textContent = watchedCount;
    statRating.textContent = avg.toFixed(1);

    // Completion percentage
    const completionPercent = total > 0 ? Math.round((watchedCount / total) * 100) : 0;
    statCompletion.textContent = `${completionPercent}%`;

    // Radial ring animation (dasharray = 150.79 corresponds to 2 * PI * r = 2 * 3.14159 * 24 = 150.79)
    const circumference = 150.79;
    const offset = circumference - (completionPercent / 100) * circumference;
    statProgressBar.style.strokeDashoffset = offset;
  }

  // --- Filtering & Sorting ---
  function getFilteredAndSortedItems() {
    let result = [...state.items];
    
    // Filter by Tab
    if (state.currentTab === 'watchlist') {
      result = result.filter(item => !item.watched);
    } else if (state.currentTab === 'watched') {
      result = result.filter(item => item.watched);
    }

    // Filter by Search Queries (Title or IMDb ID)
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.imdb_id.toLowerCase().includes(q)
      );
    }

    // Filter by Year
    if (state.filterYear) {
      const y = parseInt(state.filterYear);
      result = result.filter(item => item.year === y || item.end_year === y);
    }

    // Sort
    result.sort((a, b) => {
      if (state.sortBy === 'newest') {
        return new Date(b.date_added) - new Date(a.date_added);
      }
      if (state.sortBy === 'oldest') {
        return new Date(a.date_added) - new Date(b.date_added);
      }
      if (state.sortBy === 'rating-high') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (state.sortBy === 'rating-low') {
        return (a.rating || 999) - (b.rating || 999);
      }
      if (state.sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      }
      if (state.sortBy === 'year-desc') {
        return b.year - a.year;
      }
      return 0;
    });

    return result;
  }

  function populateYearFilterDropdown() {
    const activeYear = filterYearSelect.value;
    
    // Extract unique years
    const yearsSet = new Set();
    state.items.forEach(item => {
      if (item.year) yearsSet.add(item.year);
      if (item.end_year) yearsSet.add(item.end_year);
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    
    // Clear and build options
    filterYearSelect.innerHTML = '<option value="">All Years</option>';
    sortedYears.forEach(y => {
      const option = document.createElement('option');
      option.value = y;
      option.textContent = y;
      filterYearSelect.appendChild(option);
    });

    // Restore selected value
    if (yearsSet.has(parseInt(activeYear))) {
      filterYearSelect.value = activeYear;
    } else {
      state.filterYear = '';
    }
  }

  function toggleClearFiltersButton() {
    if (state.searchQuery || state.filterYear) {
      clearFiltersBtn.classList.remove('hidden');
    } else {
      clearFiltersBtn.classList.add('hidden');
    }
  }

  // --- Form Real-Time Previews ---
  function updateLivePreview() {
    // Title
    previewTitle.textContent = addTitle.value.trim() || 'Your Media Title';
    
    // Year & Type
    const yearVal = addYear.value || '2026';
    const endYearVal = addEndYear.value;
    if (addIsTv.checked) {
      previewTypeTag.textContent = 'TV Show';
      previewYear.textContent = endYearVal ? `${yearVal} - ${endYearVal}` : `${yearVal}`;
    } else {
      previewTypeTag.textContent = 'Movie';
      previewYear.textContent = yearVal;
    }

    // Poster URL
    const url = addPosterUrl.value.trim();
    if (url) {
      previewPoster.src = url;
    } else {
      previewPoster.src = 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=400&auto=format&fit=crop';
    }

    // Watched Status & Badges
    const isWatched = addWatched.checked;
    if (isWatched) {
      previewWatchedBadge.textContent = 'Watched';
      previewWatchedBadge.className = 'media-badge badge-watched';
      
      const rating = addRating.value;
      if (rating) {
        previewRating.textContent = parseFloat(rating).toFixed(1);
        previewRatingContainer.style.display = 'flex';
      } else {
        previewRating.textContent = '--';
        previewRatingContainer.style.display = 'none';
      }

      previewComment.textContent = addComment.value.trim() 
        ? `"${addComment.value.trim()}"` 
        : '"Your thoughts and personal notes will appear here once marked as watched."';
      previewComment.classList.remove('text-muted', 'italic');
    } else {
      previewWatchedBadge.textContent = 'Watchlist';
      previewWatchedBadge.className = 'media-badge badge-unwatched';
      previewRatingContainer.style.display = 'none';
      previewComment.textContent = 'On your watchlist. Ready for a screening!';
      previewComment.classList.add('text-muted', 'italic');
    }
  }

  // --- Modals Orchestration ---
  function openEditDialog(imdbId) {
    const item = state.items.find(i => i.imdb_id === imdbId);
    if (!item) return;

    editImdbId.value = item.imdb_id;
    editImdbIdDisplay.value = item.imdb_id;
    editTitle.value = item.title;
    editYear.value = item.year || '';
    
    const isTv = !!item.end_year;
    editIsTv.checked = isTv;
    if (isTv) {
      editGroupEndYear.classList.remove('hidden');
      editEndYear.disabled = false;
      editEndYear.value = item.end_year || '';
    } else {
      editGroupEndYear.classList.add('hidden');
      editEndYear.disabled = true;
      editEndYear.value = '';
    }

    editPosterUrl.value = (item.poster_url && item.poster_url.length > 0) ? item.poster_url[0] : '';
    editWatched.checked = item.watched;

    if (item.watched) {
      editWatchedFields.classList.add('active');
      editWatchedFields.classList.remove('hidden');
      editRating.value = item.rating !== null && item.rating !== undefined ? item.rating : '';
      editComment.value = item.comment || '';
      editRating.disabled = false;
      editComment.disabled = false;
    } else {
      editWatchedFields.classList.remove('active');
      editWatchedFields.classList.add('hidden');
      editRating.value = '';
      editComment.value = '';
      editRating.disabled = true;
      editComment.disabled = true;
    }

    // Reset error styling
    clearValidationErrors(editForm);
    editDialog.showModal();
    lucide.createIcons();
  }

  function openDeleteDialog(imdbId, title) {
    activeDeleteImdbId = imdbId;
    deleteMediaTitle.textContent = title;
    deleteDialog.showModal();
    lucide.createIcons();
  }

  // --- Form Validations ---
  function validateForm(form) {
    let isValid = true;
    clearValidationErrors(form);

    const inputs = form.querySelectorAll('[required]');
    inputs.forEach(input => {
      // Basic text / empty check
      if (!input.value.trim()) {
        markInputError(input);
        isValid = false;
      }
      
      // IMDb regex validation
      if (input.id === 'add-imdb-id' && !/^tt\d{7,10}$/.test(input.value.trim())) {
        markInputError(input);
        isValid = false;
      }

      // Numeric validations for release year
      if (input.type === 'number') {
        const val = parseInt(input.value);
        const min = parseInt(input.getAttribute('min'));
        const max = parseInt(input.getAttribute('max'));
        
        if (isNaN(val) || val < min || val > max) {
          markInputError(input);
          isValid = false;
        }
      }
    });

    // TV show end year validation
    if (form.id === 'add-media-form') {
      if (addIsTv.checked && addEndYear.value) {
        const relYear = parseInt(addYear.value);
        const endYear = parseInt(addEndYear.value);
        if (endYear < relYear || endYear < 1900 || endYear > 2050) {
          markInputError(addEndYear);
          isValid = false;
        }
      }
    } else if (form.id === 'edit-media-form') {
      if (editIsTv.checked && editEndYear.value) {
        const relYear = parseInt(editYear.value);
        const endYear = parseInt(editEndYear.value);
        if (endYear < relYear || endYear < 1900 || endYear > 2050) {
          markInputError(editEndYear);
          isValid = false;
        }
      }
    }

    // Watched fields validation (only if watched is checked)
    const watchedToggle = form.querySelector('[name="watched"]');
    if (watchedToggle && watchedToggle.checked) {
      const ratingInput = form.querySelector('[name="rating"]');
      const commentInput = form.querySelector('[name="comment"]');
      
      // Personal rating is optional, but if provided, must be 0-10
      if (ratingInput.value) {
        const val = parseFloat(ratingInput.value);
        if (isNaN(val) || val < 0 || val > 10) {
          markInputError(ratingInput);
          isValid = false;
        }
      }

      // Review comment is optional, but if provided, must be 5-1000 chars
      if (commentInput.value.trim()) {
        const len = commentInput.value.trim().length;
        if (len < 5 || len > 1000) {
          markInputError(commentInput);
          isValid = false;
        }
      }
    }

    return isValid;
  }

  function markInputError(input) {
    const group = input.closest('.form-group');
    if (group) group.classList.add('has-error');
  }

  function clearValidationErrors(form) {
    form.querySelectorAll('.form-group').forEach(group => {
      group.classList.remove('has-error');
    });
  }

  // --- Reset Forms ---
  function resetAddForm() {
    addForm.reset();
    clearValidationErrors(addForm);
    groupEndYear.classList.add('hidden');
    addEndYear.disabled = true;
    watchedFields.classList.remove('active');
    watchedFields.classList.add('hidden');
    addRating.disabled = true;
    addComment.disabled = true;
    updateLivePreview();
  }

  // --- Toast Notification Manager ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'x-circle';
    
    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <div class="toast-content">${escapeHtml(message)}</div>
    `;
    
    toastContainer.appendChild(toast);
    lucide.createIcons();

    // Fade out after 4 seconds
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      toast.addEventListener('animationend', () => {
        toast.remove();
      });
    }, 4000);
  }

  // --- Navigation & Core Helpers ---
  function switchTab(tabName) {
    state.currentTab = tabName;
    
    tabButtons.forEach(btn => {
      if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (tabName === 'add') {
      panels.list.classList.remove('active');
      panels.add.classList.add('active');
    } else {
      panels.add.classList.remove('active');
      panels.list.classList.add('active');
      render();
    }
  }

  function showLoader() {
    mediaGrid.innerHTML = `
      <div class="loader-container">
        <div class="loader"></div>
        <p>Loading your vault...</p>
      </div>
    `;
    emptyState.classList.add('hidden');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // --- Event Listeners Wiring ---

  authForm.addEventListener('submit', handleSignIn);
  signUpBtn.addEventListener('click', handleSignUp);
  signOutBtn.addEventListener('click', handleSignOut);
  changePasswordBtn.addEventListener('click', openPasswordDialog);
  deleteAccountBtn.addEventListener('click', openDeleteAccountDialog);
  passwordForm.addEventListener('submit', handleChangePassword);
  passwordDialog.addEventListener('close', () => {
    clearValidationErrors(passwordForm);
  });
  
  deleteAccountDialog.addEventListener('close', () => {
    clearValidationErrors(passwordForm);
  });
  
  closePasswordModal.addEventListener('click', closePasswordDialog);
  cancelPasswordBtn.addEventListener('click', closePasswordDialog);
  closeAccountDeleteModal.addEventListener('click', closeDeleteAccountDialog);
  cancelAccountDeleteBtn.addEventListener('click', closeDeleteAccountDialog);
  confirmAccountDeleteBtn.addEventListener('click', handleDeleteAccount);
  
  // Tabs Navigation
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  emptyAddBtn.addEventListener('click', () => {
    switchTab('add');
  });

  // Searching & Filtering
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    toggleClearFiltersButton();
    render();
  });

  filterYearSelect.addEventListener('change', (e) => {
    state.filterYear = e.target.value;
    toggleClearFiltersButton();
    render();
  });

  sortBySelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    render();
  });

  clearFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterYearSelect.value = '';
    state.searchQuery = '';
    state.filterYear = '';
    toggleClearFiltersButton();
    render();
  });

  // TV Toggle Event (Add Form)
  addIsTv.addEventListener('change', (e) => {
    if (e.target.checked) {
      groupEndYear.classList.remove('hidden');
      addEndYear.disabled = false;
    } else {
      groupEndYear.classList.add('hidden');
      addEndYear.disabled = true;
      addEndYear.value = '';
    }
    updateLivePreview();
  });

  // Watched Toggle (Add Form)
  addWatched.addEventListener('change', (e) => {
    if (e.target.checked) {
      watchedFields.classList.add('active');
      watchedFields.classList.remove('hidden');
      addRating.disabled = false;
      addComment.disabled = false;
    } else {
      watchedFields.classList.remove('active');
      watchedFields.classList.add('hidden');
      addRating.value = '';
      addComment.value = '';
      addRating.disabled = true;
      addComment.disabled = true;
      clearValidationErrors(addForm);
    }
    updateLivePreview();
  });

  // Live previews on inputs
  [addImdbId, addTitle, addYear, addEndYear, addPosterUrl, addRating, addComment].forEach(el => {
    el.addEventListener('input', updateLivePreview);
  });

  addResetBtn.addEventListener('click', resetAddForm);
  
  // Submit handlers
  addForm.addEventListener('submit', handleAddSubmit);
  editForm.addEventListener('submit', handleEditSubmit);

  // Edit TV checkbox toggle
  editIsTv.addEventListener('change', (e) => {
    if (e.target.checked) {
      editGroupEndYear.classList.remove('hidden');
      editEndYear.disabled = false;
    } else {
      editGroupEndYear.classList.add('hidden');
      editEndYear.disabled = true;
      editEndYear.value = '';
    }
  });

  // Edit Watched fields toggle
  editWatched.addEventListener('change', (e) => {
    if (e.target.checked) {
      editWatchedFields.classList.add('active');
      editWatchedFields.classList.remove('hidden');
      editRating.disabled = false;
      editComment.disabled = false;
    } else {
      editWatchedFields.classList.remove('active');
      editWatchedFields.classList.add('hidden');
      editRating.value = '';
      editComment.value = '';
      editRating.disabled = true;
      editComment.disabled = true;
      clearValidationErrors(editForm);
    }
  });

  // Dialog management close handlers
  closeEditModal.addEventListener('click', () => editDialog.close());
  cancelEditBtn.addEventListener('click', () => editDialog.close());
  
  closeDeleteModal.addEventListener('click', () => deleteDialog.close());
  cancelDeleteBtn.addEventListener('click', () => deleteDialog.close());
  confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);

  // --- Initializer ---
  async function init() {
    lucide.createIcons();
    resetAddForm();
    try {
      await loadAuthConfig();
      if (state.authReady) await fetchAllItems();
    } catch (error) {
      hideVault();
      showToast(error.message, 'error');
    }
  }

  init();
});
