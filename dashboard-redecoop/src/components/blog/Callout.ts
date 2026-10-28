import { mergeAttributes, Node } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return { emoji: { default: '💡' } }
  },

  parseHTML() {
    return [
      {
        tag: 'div.kg-callout-card',
        contentElement: 'div.kg-callout-text',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false
          return { emoji: element.querySelector('.kg-callout-emoji')?.textContent?.trim() || '💡' }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const emoji = String(HTMLAttributes.emoji || '💡')
    const rest = { ...HTMLAttributes }
    delete rest.emoji
    return [
      'div',
      mergeAttributes(rest, { class: 'kg-callout-card' }),
      ['div', { class: 'kg-callout-emoji' }, emoji],
      ['div', { class: 'kg-callout-text' }, 0],
    ]
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    }
  },
})

/** iframe de vídeo (Vimeo). YouTube usa a extensão própria. */
export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      title: { default: 'Vídeo' },
    }
  },
  parseHTML() {
    return [{ tag: 'iframe[src]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes, { allowfullscreen: 'true', class: 'blog-embed' })]
  },
})
