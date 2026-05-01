import type { Lane, MindNode, NodeKind } from '../shared/types/workspace';
import { defaultNodeFontSize } from '../shared/nodeTypography';

type NodeSize = {
  width: number;
  height: number;
};

type PositionedBox = NodeSize & {
  x: number;
  y: number;
};

type Side = 'left' | 'right';

const laneTop: Record<Lane, number> = {
  upper: 120,
  middle: 260,
  lower: 410
};

const laneOrder: Lane[] = ['upper', 'middle', 'lower'];

const nodeSizes: Record<NodeKind, NodeSize> = {
  root: { width: 192, height: 42 },
  group: { width: 250, height: 42 },
  case: { width: 250, height: 84 },
  condition: { width: 360, height: 84 },
  step: { width: 360, height: 108 },
  expected: { width: 360, height: 84 }
};

const fallbackDepthGap = 210;
const fallbackOrderGap = 72;
const levelGap = 460;
const branchGap = 32;
const forestGap = 52;
const canvasPadding = 96;
const minNodeHeights: Record<NodeKind, number> = {
  root: 42,
  group: 42,
  case: 84,
  condition: 84,
  step: 108,
  expected: 84
};

function estimateTextHeight(node: MindNode, width: number) {
  const text = node.title || '';
  const fontSize = node.fontSize || defaultNodeFontSize;
  const usableWidth = Math.max(120, width - 24);
  const averageCharWidth = Math.max(6, fontSize * 0.56);
  const charsPerLine = Math.max(8, Math.floor(usableWidth / averageCharWidth));
  const lineHeight = Math.ceil(fontSize * 1.5);
  const explicitLines = text.split(/\r?\n/);
  const lineCount = explicitLines.reduce((sum, line) => {
    return sum + Math.max(1, Math.ceil(line.length / charsPerLine));
  }, 0);
  return lineCount * lineHeight;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function compareNodeOrder(a: MindNode, b: MindNode) {
  return (
    a.order - b.order ||
    laneOrder.indexOf(a.lane) - laneOrder.indexOf(b.lane) ||
    a.depth - b.depth ||
    a.id.localeCompare(b.id)
  );
}

export function getMindNodeSize(node: MindNode): NodeSize {
  const base = nodeSizes[node.kind] || nodeSizes.case;
  if (node.kind === 'root' || node.kind === 'group') {
    return {
      width: base.width,
      height: Math.max(base.height, Math.ceil(estimateTextHeight(node, base.width) + 16))
    };
  }

  const metaRows = (node.priority ? 1 : 0) + (node.executionStatus ? 1 : 0) + (node.tags?.length ? 1 : 0);
  const height = Math.max(minNodeHeights[node.kind], estimateTextHeight(node, base.width) + 18 + metaRows * 24);
  return {
    width: base.width,
    height: Math.ceil(height)
  };
}

export function getMindNodePosition(node: MindNode) {
  if (isFiniteNumber(node.layout?.x) && isFiniteNumber(node.layout?.y)) {
    return {
      x: node.layout.x,
      y: node.layout.y
    };
  }

  return {
    x: 140 + node.depth * fallbackDepthGap,
    y: laneTop[node.lane] + node.order * fallbackOrderGap
  };
}

export function getMindNodeBox(node: MindNode): PositionedBox {
  const position = getMindNodePosition(node);
  const size = getMindNodeSize(node);

  return {
    ...position,
    ...size
  };
}

export function getMindMapBounds(nodes: MindNode[]) {
  if (nodes.length === 0) {
    return {
      width: 1320,
      height: 620
    };
  }

  const boxes = nodes.map(getMindNodeBox);
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));

  return {
    width: Math.max(1320, Math.ceil(maxX + canvasPadding)),
    height: Math.max(620, Math.ceil(maxY + canvasPadding))
  };
}

export function autoBalanceMindMap(nodes: MindNode[]): MindNode[] {
  const root = nodes.find((node) => node.kind === 'root') || nodes.find((node) => !node.parentId);
  if (!root) {
    return nodes;
  }

  const balanced = nodes.map((node) => ({ ...node, layout: node.layout ? { ...node.layout } : undefined }));
  const byId = new Map(balanced.map((node) => [node.id, node]));
  const childMap = new Map<string, MindNode[]>();

  for (const node of balanced) {
    if (!node.parentId || !byId.has(node.parentId) || node.id === root.id) {
      continue;
    }
    if (!childMap.has(node.parentId)) {
      childMap.set(node.parentId, []);
    }
    childMap.get(node.parentId)!.push(node);
  }

  for (const children of childMap.values()) {
    children.sort(compareNodeOrder);
  }

  const heightCache = new Map<string, number>();

  function getChildren(id: string) {
    return childMap.get(id) || [];
  }

  function measureSubtree(id: string, visiting = new Set<string>()): number {
    if (heightCache.has(id)) {
      return heightCache.get(id)!;
    }

    const node = byId.get(id);
    if (!node || visiting.has(id)) {
      return nodeSizes.case.height;
    }

    visiting.add(id);
    const ownHeight = getMindNodeSize(node).height;
    const children = getChildren(id);
    const childHeight = children.length
      ? children.reduce((sum, child) => sum + measureSubtree(child.id, visiting), 0) + branchGap * (children.length - 1)
      : 0;
    visiting.delete(id);

    const height = Math.max(ownHeight, childHeight);
    heightCache.set(id, height);
    return height;
  }

  const sideById = new Map<string, Side>();
  const rootChildren = getChildren(root.id);
  const sideTotals: Record<Side, number> = { left: 0, right: 0 };

  if (rootChildren.length === 1) {
    sideById.set(rootChildren[0].id, 'right');
    sideTotals.right = measureSubtree(rootChildren[0].id);
  } else {
    const weightedChildren = [...rootChildren].sort((a, b) => {
      const heightDelta = measureSubtree(b.id) - measureSubtree(a.id);
      return heightDelta || compareNodeOrder(a, b);
    });

    for (const child of weightedChildren) {
      const originalIndex = rootChildren.findIndex((item) => item.id === child.id);
      const tieSide: Side = originalIndex % 2 === 0 ? 'right' : 'left';
      const targetSide: Side =
        sideTotals.left === sideTotals.right
          ? tieSide
          : sideTotals.left < sideTotals.right
            ? 'left'
            : 'right';

      sideById.set(child.id, targetSide);
      sideTotals[targetSide] += measureSubtree(child.id) + forestGap;
    }
  }

  function assignSide(id: string, side: Side) {
    sideById.set(id, side);
    for (const child of getChildren(id)) {
      assignSide(child.id, side);
    }
  }

  for (const child of rootChildren) {
    assignSide(child.id, sideById.get(child.id) || 'right');
  }

  const positioned = new Map<string, PositionedBox>();

  function getForestHeight(branches: MindNode[]) {
    if (branches.length === 0) {
      return 0;
    }
    return branches.reduce((sum, child) => sum + measureSubtree(child.id), 0) + forestGap * (branches.length - 1);
  }

  function layoutSubtree(node: MindNode, side: Side, level: number, topY: number) {
    const children = getChildren(node.id);
    const size = getMindNodeSize(node);
    const subtreeHeight = measureSubtree(node.id);
    const childTotalHeight = children.length
      ? children.reduce((sum, child) => sum + measureSubtree(child.id), 0) + branchGap * (children.length - 1)
      : 0;

    let cursor = topY + Math.max(0, (subtreeHeight - childTotalHeight) / 2);
    const childCenters: number[] = [];

    for (const child of children) {
      layoutSubtree(child, side, level + 1, cursor);
      const childBox = positioned.get(child.id);
      if (childBox) {
        childCenters.push(childBox.y + childBox.height / 2);
      }
      cursor += measureSubtree(child.id) + branchGap;
    }

    const centerY = childCenters.length
      ? (childCenters[0] + childCenters[childCenters.length - 1]) / 2
      : topY + subtreeHeight / 2;
    const centerX = side === 'right' ? level * levelGap : -level * levelGap;

    positioned.set(node.id, {
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
      ...size
    });
  }

  const rootSize = getMindNodeSize(root);
  positioned.set(root.id, {
    x: -rootSize.width / 2,
    y: -rootSize.height / 2,
    ...rootSize
  });

  for (const side of ['left', 'right'] as Side[]) {
    const sideRoots = rootChildren.filter((child) => sideById.get(child.id) === side);
    const forestHeight = getForestHeight(sideRoots);
    let cursor = -forestHeight / 2;

    for (const child of sideRoots) {
      layoutSubtree(child, side, 1, cursor);
      cursor += measureSubtree(child.id) + forestGap;
    }
  }

  const boxes = Array.from(positioned.values());
  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const shiftX = canvasPadding - minX;
  const shiftY = canvasPadding - minY;

  for (const node of balanced) {
    const box = positioned.get(node.id);
    if (!box) {
      continue;
    }

    node.layout = {
      x: Math.round(box.x + shiftX),
      y: Math.round(box.y + shiftY),
      width: box.width,
      height: box.height
    };
  }

  const rootBox = balanced.find((node) => node.id === root.id)?.layout;
  const rootCenterY = (rootBox?.y || canvasPadding) + (rootBox?.height || rootSize.height) / 2;
  const orderedByY = balanced
    .filter((node) => node.id !== root.id)
    .sort((a, b) => getMindNodePosition(a).y - getMindNodePosition(b).y || compareNodeOrder(a, b));
  const nextOrder = new Map<Lane, number>(laneOrder.map((lane) => [lane, 0]));

  for (const node of orderedByY) {
    const box = getMindNodeBox(node);
    const centerY = box.y + box.height / 2;
    const lane: Lane =
      centerY < rootCenterY - 80
        ? 'upper'
        : centerY > rootCenterY + 80
          ? 'lower'
          : 'middle';

    node.lane = lane;
    node.order = nextOrder.get(lane)!;
    nextOrder.set(lane, node.order + 1);
  }

  const balancedRoot = balanced.find((node) => node.id === root.id);
  if (balancedRoot) {
    balancedRoot.lane = 'middle';
    balancedRoot.depth = 0;
    balancedRoot.order = 0;
  }

  return balanced;
}
