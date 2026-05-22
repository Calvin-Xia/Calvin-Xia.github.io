const MARK_PATTERN = /==(?=\S)([\s\S]*?\S)==(?![=])/g;
const SKIPPED_NODE_TYPES = new Set(['code', 'inlineCode', 'html', 'yaml']);

function createMarkNode(value) {
    return {
        type: 'markHighlight',
        data: { hName: 'mark' },
        children: [{ type: 'text', value }],
    };
}

function splitTextNode(node) {
    const value = String(node.value || '');
    const nodes = [];
    let lastIndex = 0;

    for (const match of value.matchAll(MARK_PATTERN)) {
        const matchIndex = match.index ?? 0;
        if (matchIndex > lastIndex) {
            nodes.push({ type: 'text', value: value.slice(lastIndex, matchIndex) });
        }

        nodes.push(createMarkNode(match[1]));
        lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < value.length) {
        nodes.push({ type: 'text', value: value.slice(lastIndex) });
    }

    return nodes.length ? nodes : [node];
}

function visit(node) {
    if (!node || SKIPPED_NODE_TYPES.has(node.type) || !Array.isArray(node.children)) {
        return;
    }

    node.children = node.children.flatMap((child) => {
        if (child.type === 'text' && String(child.value || '').includes('==')) {
            return splitTextNode(child);
        }

        visit(child);
        return [child];
    });
}

export function remarkMarkHighlight() {
    return (tree) => {
        visit(tree);
    };
}
