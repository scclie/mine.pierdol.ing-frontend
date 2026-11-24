function readPage(url) {
  const values = url.searchParams.getAll('page');
  if (values.length !== 1 || !/^[0-9]+$/.test(values[0])) return 1;
  const page = Number(values[0]);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function validateRanking(payload, requestedPage) {
  const integer = (value, minimum = 0) => Number.isSafeInteger(value) && value >= minimum;
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!object(payload) || payload.page_size !== 50 || !integer(payload.total_players)
      || !integer(payload.total_pages, 1) || !integer(payload.page, 1)
      || payload.total_pages !== Math.max(1, Math.ceil(payload.total_players / 50))
      || payload.page !== Math.min(requestedPage, payload.total_pages)
      || !Array.isArray(payload.players)) throw new Error('invalid ranking response');

  const timestamp = payload.updated_at;
  if (typeof timestamp !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(timestamp)
      || !Number.isFinite(Date.parse(timestamp))
      || new Date(timestamp).toISOString().slice(0, 19) !== timestamp.slice(0, 19)) {
    throw new Error('invalid ranking timestamp');
  }
  const offset = (payload.page - 1) * 50;
  if (payload.players.length !== Math.min(50, payload.total_players - offset)) {
    throw new Error('invalid ranking row count');
  }
  payload.players.forEach((player, index) => {
    if (!object(player) || !integer(player.rank, 1) || player.rank !== offset + index + 1
        || !integer(player.active_minutes) || typeof player.minecraft_nickname !== 'string'
        || player.minecraft_nickname.trim().length === 0 || typeof player.banned !== 'boolean') {
      throw new Error('invalid ranking player');
    }
  });
  return payload;
}

const root = document.querySelector('[data-ranking]');
if (root) {
  const find = (name) => root.querySelector(`[data-ranking-${name}]`);
  const error = find('error');
  const table = find('table');
  const body = find('body');
  const empty = find('empty');
  const updated = find('updated');
  const previous = find('prev');
  const next = find('next');
  const pageLabel = find('page');
  let lastSuccessful = null;
  let controller = null;
  let requestId = 0;
  let previousPage = null;
  let nextPage = null;

  function pageUrl(page) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(page));
    return url;
  }

  function setPager(loading, failedPage = null) {
    const payload = lastSuccessful;
    pageLabel.textContent = payload
      ? `page ${payload.page}/${payload.total_pages}`
      : `page ${failedPage || readPage(new URL(window.location.href))} loading error ;/`;
    previousPage = payload && payload.page > 1 ? payload.page - 1 : null;
    nextPage = payload && payload.page < payload.total_pages ? payload.page + 1 : null;
    previous.textContent = '[ back ]';
    next.textContent = '[ next ]';
    if (failedPage !== null) {
      previousPage = payload ? payload.page : (failedPage > 1 ? 1 : null);
      nextPage = failedPage;
      if (previousPage !== null) previous.textContent = `[ to the ${previousPage} ]`;
      next.textContent = '[ retry ]';
    }
    previous.setAttribute('aria-disabled', String(loading || previousPage === null));
    next.setAttribute('aria-disabled', String(loading || nextPage === null));
  }

  function renderRanking(payload) {
    const fragment = document.createDocumentFragment();
    for (const player of payload.players) {
      const row = document.createElement('tr');
      const rank = document.createElement('td');
      rank.textContent = String(player.rank);
      const nickname = document.createElement('td');
      const name = document.createElement('span');
      name.textContent = player.minecraft_nickname;
      nickname.append(name);
      if (player.banned) {
        name.className = 'ranking-nickname--banned';
        const label = document.createElement('span');
        label.className = 'ranking-banned-label';
        label.textContent = ' banned';
        nickname.append(label);
      }
      const time = document.createElement('td');
      time.textContent = `${Math.floor(player.active_minutes / 60)} ч ${player.active_minutes % 60} мин`;
      row.append(rank, nickname, time);
      fragment.append(row);
    }
    body.replaceChildren(fragment);
    if (updated) {
      updated.dateTime = payload.updated_at;
      updated.textContent = new Date(payload.updated_at).toLocaleString('ru-RU', { timeZone: 'UTC' }) + ' UTC';
    }
    table.hidden = payload.players.length === 0;
    empty.hidden = payload.players.length !== 0;
  }

  async function loadPage(page, origin) {
    controller?.abort();
    const id = ++requestId;
    controller = new AbortController();
    const currentController = controller;
    if (origin === 'pagination') window.history.pushState(null, '', pageUrl(page));
    else window.history.replaceState(null, '', pageUrl(page));
    root.setAttribute('aria-busy', 'true');
    error.hidden = true;
    setPager(true);
    let failed = false;
    const timeout = window.setTimeout(() => currentController.abort(), 10000);
    try {
      const response = await fetch(`/api/v1/public/ranking?page=${page}`, {
        credentials: 'omit', cache: 'default', redirect: 'error',
        headers: { Accept: 'application/json' }, signal: currentController.signal,
      });
      if (!response.ok) throw new Error('Ranking request failed');
      const payload = validateRanking(await response.json(), page);
      if (id !== requestId) return;
      lastSuccessful = payload;
      renderRanking(payload);
      if (payload.page !== page) window.history.replaceState(null, '', pageUrl(payload.page));
    } catch (cause) {
      if (id !== requestId) return;
      failed = true;
      error.textContent = `error while loading page ${page}.${cause.name === 'AbortError' ? ' timeout ;/' : ''} ${lastSuccessful ? `page ${lastSuccessful.page}.` : 'data load error'} u can retry ;k.`;
      error.hidden = false;
    } finally {
      window.clearTimeout(timeout);
      if (id === requestId) {
        root.setAttribute('aria-busy', 'false');
        setPager(false, failed ? page : null);
      }
    }
  }

  previous.addEventListener('click', () => {
    if (previous.getAttribute('aria-disabled') !== 'true') loadPage(previousPage, 'pagination');
  });
  next.addEventListener('click', () => {
    if (next.getAttribute('aria-disabled') !== 'true') loadPage(nextPage, 'pagination');
  });
  window.addEventListener('popstate', () => loadPage(readPage(new URL(window.location.href)), 'popstate'));
  loadPage(readPage(new URL(window.location.href)), 'initial');
}
