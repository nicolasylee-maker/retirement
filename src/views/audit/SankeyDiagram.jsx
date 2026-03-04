import React, { useRef, useEffect } from 'react';
import { select } from 'd3-selection';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { formatCurrency } from '../../utils/formatters';

const NODE_COLORS = {
  income: '#22c55e',
  expense: '#ef4444',
  tax: '#f59e0b',
  saving: '#0ea5e9',
  withdrawal: '#8b5cf6',
  default: '#6b7280',
};

/**
 * D3 Sankey diagram showing money flows for a single year.
 * @param {Object} props
 * @param {Array<{name: string, category: string}>} props.nodes
 * @param {Array<{source: number, target: number, value: number}>} props.links
 * @param {number} [props.width]
 * @param {number} [props.height]
 */
export default function SankeyDiagram({ nodes, links, width = 500, height = 320 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !nodes?.length || !links?.length) return;

    const validLinks = links.filter(l => l.value > 0);
    if (validLinks.length === 0) return;

    const svg = select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 10, right: 10, bottom: 10, left: 10 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const sankeyLayout = sankey()
      .nodeId(d => d.index)
      .nodeWidth(16)
      .nodePadding(12)
      .extent([[0, 0], [w, h]]);

    const graph = sankeyLayout({
      nodes: nodes.map(d => ({ ...d })),
      links: validLinks.map(d => ({ ...d })),
    });

    // Links
    g.append('g')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('fill', 'none')
      .attr('stroke', d => {
        const cat = graph.nodes[d.source.index]?.category || 'default';
        return NODE_COLORS[cat] || NODE_COLORS.default;
      })
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', d => Math.max(1, d.width))
      .append('title')
      .text(d => `${d.source.name} → ${d.target.name}: ${formatCurrency(d.value)}`);

    // Nodes
    g.append('g')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('height', d => Math.max(1, d.y1 - d.y0))
      .attr('width', d => d.x1 - d.x0)
      .attr('fill', d => NODE_COLORS[d.category] || NODE_COLORS.default)
      .attr('rx', 2)
      .append('title')
      .text(d => `${d.name}: ${formatCurrency(d.value)}`);

    // Labels
    g.append('g')
      .selectAll('text')
      .data(graph.nodes)
      .join('text')
      .attr('x', d => d.x0 < w / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr('y', d => (d.y0 + d.y1) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => d.x0 < w / 2 ? 'start' : 'end')
      .attr('font-size', '11px')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('fill', '#374151')
      .text(d => `${d.name} ${formatCurrency(d.value)}`);

  }, [nodes, links, width, height]);

  if (!nodes?.length || !links?.length) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>
        No money flows for this year
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    />
  );
}

/**
 * Build Sankey nodes + links from a projection year row.
 */
export function buildSankeyData(row, scenario) {
  const nodes = [];
  const links = [];
  let idx = 0;

  const addNode = (name, category) => {
    nodes.push({ name, category });
    return idx++;
  };

  // Income sources
  const incomes = [];
  if (row.employmentIncome > 0) incomes.push({ name: 'Salary', value: row.employmentIncome, cat: 'income' });
  if (row.cppIncome > 0) incomes.push({ name: 'CPP', value: row.cppIncome, cat: 'income' });
  if (row.oasIncome > 0) incomes.push({ name: 'OAS', value: row.oasIncome, cat: 'income' });
  if (row.pensionIncome > 0) incomes.push({ name: 'Pension', value: row.pensionIncome, cat: 'income' });
  if (row.gisIncome > 0) incomes.push({ name: 'GIS', value: row.gisIncome, cat: 'income' });
  if (row.gainsIncome > 0) incomes.push({ name: 'GAINS', value: row.gainsIncome, cat: 'income' });
  if (row.rrspWithdrawal > 0) incomes.push({ name: 'RRSP/RRIF', value: row.rrspWithdrawal, cat: 'withdrawal' });
  if (row.tfsaWithdrawal > 0) incomes.push({ name: 'TFSA Draw', value: row.tfsaWithdrawal, cat: 'withdrawal' });
  if (row.nonRegWithdrawal > 0) incomes.push({ name: 'Non-Reg Draw', value: row.nonRegWithdrawal, cat: 'withdrawal' });

  if (incomes.length === 0) return { nodes: [], links: [] };

  // Hub node
  const hubIdx = addNode('Total', 'default');

  // Source nodes → hub
  for (const inc of incomes) {
    const srcIdx = addNode(inc.name, inc.cat);
    links.push({ source: srcIdx, target: hubIdx, value: inc.value });
  }

  // Hub → outflows
  if (row.expenses > 0) {
    const expIdx = addNode('Expenses', 'expense');
    links.push({ source: hubIdx, target: expIdx, value: row.expenses });
  }
  if (row.totalTax > 0) {
    const taxIdx = addNode('Tax', 'tax');
    links.push({ source: hubIdx, target: taxIdx, value: row.totalTax });
  }
  if (row.debtPayments > 0) {
    const debtIdx = addNode('Debt', 'expense');
    links.push({ source: hubIdx, target: debtIdx, value: row.debtPayments });
  }

  // Savings (surplus)
  const surplus = row.surplus || 0;
  if (surplus > 0) {
    if (row.tfsaDeposit > 0) {
      const tfsaIdx = addNode('TFSA Save', 'saving');
      links.push({ source: hubIdx, target: tfsaIdx, value: row.tfsaDeposit });
    }
    const nonRegSave = surplus - (row.tfsaDeposit || 0);
    if (nonRegSave > 0) {
      const nrIdx = addNode('Non-Reg Save', 'saving');
      links.push({ source: hubIdx, target: nrIdx, value: nonRegSave });
    }
  }

  return { nodes, links };
}
