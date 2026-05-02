function splitTextNodeOnSoftBreaks(node) {
    if (node.type !== 'text' || typeof node.value !== 'string' || !node.value.includes('\n')) {
        return [node];
    }

    return node.value.split(/\r?\n/).flatMap((part, index, parts) => {
        const nodes = part ? [{ ...node, value: part }] : [];

        if (index < parts.length - 1) {
            nodes.push({ type: 'break' });
        }

        return nodes;
    });
}

function visit(node, isInsideBlockquote = false) {
    if (!node || !Array.isArray(node.children)) {
        return;
    }

    const insideBlockquote = isInsideBlockquote || node.type === 'blockquote';

    if (insideBlockquote && node.type === 'paragraph') {
        node.children = node.children.flatMap(splitTextNodeOnSoftBreaks);
        return;
    }

    node.children.forEach((child) => visit(child, insideBlockquote));
}

export function preserveBlockquoteSoftBreaks(tree) {
    visit(tree);
}

export function remarkBlockquoteBreaks() {
    return preserveBlockquoteSoftBreaks;
}
