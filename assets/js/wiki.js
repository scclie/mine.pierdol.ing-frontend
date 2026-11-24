const article = document.querySelector('[data-wiki-document]');
const navigation = document.querySelector('[data-wiki-toc]');

if (article && navigation) {
  const list = navigation.querySelector('ul');
  const headings = article.querySelectorAll('h2, h3');
  const usedIds = new Set([...document.querySelectorAll('[id]')].map((element) => element.id));

  for (const heading of headings) {
    if (!heading.id) {
      const slug = heading.textContent.trim().toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'section';
      let id = slug;
      let suffix = 2;
      while (usedIds.has(id)) id = `${slug}-${suffix++}`;
      heading.id = id;
      usedIds.add(id);
    }

    const item = document.createElement('li');
    if (heading.tagName === 'H3') item.className = 'wiki-toc-subsection';
    const link = document.createElement('a');
    link.href = `#${encodeURIComponent(heading.id)}`;
    link.textContent = heading.textContent;
    item.append(link);
    list.append(item);
  }

  navigation.hidden = headings.length === 0;
}
