const htmlElem = document.documentElement;

export const setKeyToHtmlTag = (contentKey: string) => {
  const currentKeys = htmlElem.getAttribute('data-contentstorage-keys');
  let storedKeys = [];
  try {
    storedKeys = JSON.parse(currentKeys || '');
    if (!Array.isArray(storedKeys)) {
      storedKeys = [];
    }
  } catch (e) {
    console.error('Could not parse data-contentstorage-keys:', e);
    storedKeys = [];
  }

  if (!storedKeys.includes(contentKey)) {
    storedKeys.push(contentKey);
  }

  htmlElem.setAttribute('data-contentstorage-keys', JSON.stringify(storedKeys));
};
