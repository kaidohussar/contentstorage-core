const htmlElem = document.documentElement;

export const setKeyToHtmlTag = (contentKey: string) => {
  const dataKey = `data-contentstorage-key-${contentKey}`;
  htmlElem.setAttribute(dataKey, 'true');
};
