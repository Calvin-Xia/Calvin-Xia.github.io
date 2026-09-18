// Keep native table semantics while giving wide tables their own scroll area.
export default function rehypeScrollableTables() {
    return function transform(tree) {
        function visit(node) {
            if (!Array.isArray(node.children)) return;
            if (node.properties?.className?.includes('article-table-scroll')) return;
            node.children = node.children.map((child) => {
                visit(child);
                if (child.type !== 'element' || child.tagName !== 'table') return child;
                return {
                    type: 'element',
                    tagName: 'div',
                    properties: {
                        className: ['article-table-scroll'],
                        tabIndex: 0,
                        role: 'region',
                        ariaLabel: '表格（可横向滚动）',
                    },
                    children: [child],
                };
            });
        }
        visit(tree);
    };
}
