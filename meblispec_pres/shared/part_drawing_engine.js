/**
 * MebliSpec — спільний рушій креслення однієї деталі (SVG + таблиці).
 * Витягнуто дослівно з drawing/main.rb (та сама копія, що вже працює у
 * самостійному діалозі «Креслення деталей (А4)»), щоб уникнути ризикованого
 * порту 2700-рядкового tech_engine.js. Очікує глобальні window.holeOffsets /
 * window.hiddenItems, встановлені викликачем (renderPartDrawing нижче).
 */

function getTableHtmlBlocks(p) {
              let blocks = [];
              if (p.holes && p.holes.length > 0) {
                let holesWithIdx = p.holes.map((h, i) => ({ ...h, idx: i + 1 }));
                let faceHoles = holesWithIdx.filter(h => h.side === 'ЛИЦЕВ');
                let backHoles = holesWithIdx.filter(h => h.side === 'ТЫЛЬН');
                let edgeHoles = holesWithIdx.filter(h => h.side === 'ТОРЦ');

                let groups = [
                  { title: 'ЛИЦЕВІ', color: '#1a6b46', list: faceHoles },
                  { title: 'ТИЛЬНІ', color: '#8c5a1e', list: backHoles },
                  { title: 'ТОРЦЕВІ', color: '#0056b3', list: edgeHoles }
                ];

                groups.forEach(g => {
                  if (!g.list || g.list.length === 0) return;
                  
                  let chunks = [];
                  for (let i = 0; i < g.list.length; i += 15) {
                    chunks.push(g.list.slice(i, i + 15));
                  }
                  
                  chunks.forEach((chunk, cIdx) => {
                    let subTitle = chunks.length > 1 ? `${g.title} (${chunk[0].idx}-${chunk[chunk.length-1].idx})` : `${g.title} (${g.list.length})`;
                    let tHtml = '<div style="margin-bottom:2px;">';
                    tHtml += `<div style="font-size:8.5pt; font-weight:bold; color:${g.color}; margin-bottom:2px; display:flex; align-items:center; gap:4px; font-family:'Segoe UI', Arial, sans-serif;">`;
                    tHtml += `<span style="font-size:11pt; line-height:8pt;">•</span> ${subTitle}</div>`;
                    tHtml += '<table>';
                    tHtml += '<tr><th>№</th><th>Ø</th><th>H</th><th>X</th><th>Y</th></tr>';
                    
                    chunk.forEach(h => {
                      let dStr = 'Ø' + h.d;
                      let hStr = h.is_thru ? 'наскр.' : (h.h + ' мм');
                      tHtml += `<tr><td style="font-weight:bold; text-align:center;">${h.idx}</td><td>${dStr}</td><td>${hStr}</td><td>${h.x}</td><td>${h.y}</td></tr>`;
                    });
                    
                    tHtml += '</table></div>';
                    blocks.push(tHtml);
                  });
                });
              }

               if(p.grooves && p.grooves.length > 0) {
                 let gHtml = '<div style="margin-bottom:2px;"><table><tr><th colspan="8" class="section-th">ПАЗИ</th></tr><tr><th>№</th><th>Стор.</th><th>X</th><th>Y</th><th>Z</th><th>W</th><th>L</th><th>H</th></tr>';
                 p.grooves.forEach((g, i) => {
                   let zStr = g.z !== undefined ? g.z : '-';
                   let sideStr = g.side ? (g.side.substring(0,3) + '.') : '-';
                   gHtml += `<tr><td style="font-weight:bold">П${i+1}</td><td>${sideStr}</td><td>${g.x}</td><td>${g.y}</td><td>${zStr}</td><td>${g.w}</td><td>${g.l}</td><td>${g.h}</td></tr>`;
                 });
                 gHtml += '</table></div>';
                 blocks.push(gHtml);
               }
               if(p.v_cuts && p.v_cuts.length > 0) {
                 let vHtml = '<div style="margin-bottom:2px;"><table><tr><th colspan="5" class="section-th">ВИРІЗИ ЗА ШАБЛОНОМ</th></tr><tr><th>Тип</th><th>X</th><th>Y</th><th>Розмір</th><th>R</th></tr>';
                 p.v_cuts.forEach(v => vHtml += `<tr><td>${v.t}</td><td>${v.x}</td><td>${v.y}</td><td>${v.sz}</td><td>${v.r}</td></tr>`);
                 vHtml += '</table></div>';
                 blocks.push(vHtml);
               }
               if(p.bevels && p.bevels.length > 0) {
                 let bHtml = '<div style="margin-bottom:2px;"><table><tr><th colspan="5" class="section-th">ЗРІЗИ ПІД КУТОМ</th></tr><tr><th>№</th><th>Тип</th><th>Сторона</th><th>Градус</th><th>Відступ</th></tr>';
                 p.bevels.forEach((b, i) => bHtml += `<tr><td style="font-weight:bold">${i+1}</td><td>${b.t}</td><td>${b.side}</td><td>${b.a}</td><td>${b.off}</td></tr>`);
                 bHtml += '</table></div>';
                 blocks.push(bHtml);
               }
               if(p.edge_bands && (p.edge_bands.L1 || p.edge_bands.L2 || p.edge_bands.W1 || p.edge_bands.W2)) {
                 let ebStr = [];
                 if(p.edge_bands.L1) ebStr.push('L1: '+p.edge_bands.L1);
                 if(p.edge_bands.L2) ebStr.push('L2: '+p.edge_bands.L2);
                 if(p.edge_bands.W1) ebStr.push('W1: '+p.edge_bands.W1);
                 if(p.edge_bands.W2) ebStr.push('W2: '+p.edge_bands.W2);
                 if(ebStr.length > 0) {
                   blocks.push(`<div style="margin-bottom:2px;"><table><tr><th colspan="2" class="section-th">КРОМКУВАННЯ</th></tr><tr><th style="background:#fff; text-align:left;">Сторони</th><td style="font-weight:bold;">${ebStr.join(' | ')}</td></tr></table></div>`);
                 }
               }
               return blocks;
            }
              // build205: getSideViewSVG — бокові проекції деталі (кромки/пази/отвори в торцях)
              // + габаритні розміри (window.showOverallDims). Перенесено 1:1 з drawing/main.rb,
              // щоб підсторінка «Дет. …» в презентації рендерила ІДЕНТИЧНО діалогу «Креслення
              // деталей (А4)» — раніше shared-рушій був старішою гілкою без цих нововведень.

             function getSideViewSVG(p, sc, zoom) {
              const lx = p.l || 0;
              const ly = p.w || 0;
              const lz = p.t || 0;
              
              const gap = 60 / zoom;
              
              const dimLine = (x1, y1, x2, y2, text, offset, isVert) => {
                let str = '';
                let fSz = 9.5 / zoom;
                let lx1 = x1, ly1 = y1, lx2 = x2, ly2 = y2;
                let tx = (x1 + x2) / 2, ty = (y1 + y2) / 2;
                if (isVert) {
                  lx1 += offset; lx2 += offset; tx += offset;
                  str += `<line x1="${x1}" y1="${y1}" x2="${x1 + offset + Math.sign(offset)*3/zoom}" y2="${y1}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<line x1="${x2}" y1="${y2}" x2="${x2 + offset + Math.sign(offset)*3/zoom}" y2="${y2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<line x1="${lx1}" y1="${y1}" x2="${lx2}" y2="${y2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<text x="${tx + (offset>0?3:-3)/zoom}" y="${ty}" font-family="Segoe UI, Arial" font-size="${fSz}" font-weight="bold" text-anchor="${offset>0?'start':'end'}" dominant-baseline="central" fill="#333" style="user-select:none;">${text}</text>`;
                  str += `<line x1="${lx1-3/zoom}" y1="${y1+3/zoom}" x2="${lx1+3/zoom}" y2="${y1-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<line x1="${lx2-3/zoom}" y1="${y2+3/zoom}" x2="${lx2+3/zoom}" y2="${y2-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                } else {
                  ly1 += offset; ly2 += offset; ty += offset;
                  str += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y1 + offset + Math.sign(offset)*3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<line x1="${x2}" y1="${y2}" x2="${x2}" y2="${y2 + offset + Math.sign(offset)*3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<line x1="${x1}" y1="${ly1}" x2="${x2}" y2="${ly2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<text x="${tx}" y="${ty + (offset>0?8:-4)/zoom}" font-family="Segoe UI, Arial" font-size="${fSz}" font-weight="bold" text-anchor="middle" fill="#333" style="user-select:none;">${text}</text>`;
                  str += `<line x1="${x1-3/zoom}" y1="${ly1+3/zoom}" x2="${x1+3/zoom}" y2="${ly1-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                  str += `<line x1="${x2-3/zoom}" y1="${ly2+3/zoom}" x2="${x2+3/zoom}" y2="${ly2-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                }
                return str;
              };

              const getEdgeColor = (name) => {
                if (!name || name === "" || name === "0") return "#ffffff";
                const n = name.toLowerCase();
                if (n.includes('0.4') || n.includes('0.5') || n.includes('0.6')) return '#2ca02c';
                if (n.includes('0.8')) return '#ff7f0e';
                if (n.includes('1.0') || n.includes('1 ')) return '#aec7e8';
                if (n.includes('2.0') || n.includes('2 ') || n.includes('2мм')) return '#800080';
                return '#ff7f0e';
              };
              
              let fillL1 = p.edge_bands ? getEdgeColor(p.edge_bands.L1) : "#ffffff";
              let fillL2 = p.edge_bands ? getEdgeColor(p.edge_bands.L2) : "#ffffff";
              let fillW1 = p.edge_bands ? getEdgeColor(p.edge_bands.W1) : "#ffffff";
              let fillW2 = p.edge_bands ? getEdgeColor(p.edge_bands.W2) : "#ffffff";

              function buildVerticalPolygonPoints(xFront, xBack, yTop, yBottom, bevTop, bevBottom, sc) {
                let pts = [];
                let dTop = bevTop ? (lz - (bevTop.off !== undefined ? bevTop.off : 1.0)) * sc : 0;
                let dBottom = bevBottom ? (lz - (bevBottom.off !== undefined ? bevBottom.off : 1.0)) * sc : 0;
                let step = (xBack - xFront) > 0 ? 1 : -1;
                
                // Top-Inner
                if (bevTop && bevTop.side.includes("Лиц")) {
                  pts.push({ x: xFront, y: yTop + dTop });
                  pts.push({ x: xFront + dTop * step, y: yTop });
                } else {
                  pts.push({ x: xFront, y: yTop });
                }
                
                // Top-Outer
                if (bevTop && bevTop.side.includes("Тил")) {
                  pts.push({ x: xBack - dTop * step, y: yTop });
                  pts.push({ x: xBack, y: yTop + dTop });
                } else {
                  pts.push({ x: xBack, y: yTop });
                }
                
                // Bottom-Outer
                if (bevBottom && bevBottom.side.includes("Тил")) {
                  pts.push({ x: xBack, y: yBottom - dBottom });
                  pts.push({ x: xBack - dBottom * step, y: yBottom });
                } else {
                  pts.push({ x: xBack, y: yBottom });
                }
                
                // Bottom-Inner
                if (bevBottom && bevBottom.side.includes("Лиц")) {
                  pts.push({ x: xFront + dBottom * step, y: yBottom });
                  pts.push({ x: xFront, y: yBottom - dBottom });
                } else {
                  pts.push({ x: xFront, y: yBottom });
                }
                
                return pts.map(pt => `${pt.x},${pt.y}`).join(' ');
              }

              function buildHorizontalPolygonPoints(yFront, yBack, xLeft, xRight, bevLeft, bevRight, sc) {
                let pts = [];
                let dLeft = bevLeft ? (lz - (bevLeft.off !== undefined ? bevLeft.off : 1.0)) * sc : 0;
                let dRight = bevRight ? (lz - (bevRight.off !== undefined ? bevRight.off : 1.0)) * sc : 0;
                let step = (yBack - yFront) > 0 ? 1 : -1;
                
                // Left-Inner
                if (bevLeft && bevLeft.side.includes("Лиц")) {
                  pts.push({ x: xLeft, y: yFront + dLeft * step });
                  pts.push({ x: xLeft + dLeft, y: yFront });
                } else {
                  pts.push({ x: xLeft, y: yFront });
                }
                
                // Right-Inner
                if (bevRight && bevRight.side.includes("Лиц")) {
                  pts.push({ x: xRight - dRight, y: yFront });
                  pts.push({ x: xRight, y: yFront + dRight * step });
                } else {
                  pts.push({ x: xRight, y: yFront });
                }
                
                // Right-Outer
                if (bevRight && bevRight.side.includes("Тил")) {
                  pts.push({ x: xRight, y: yBack - dRight * step });
                  pts.push({ x: xRight - dRight, y: yBack });
                } else {
                  pts.push({ x: xRight, y: yBack });
                }
                
                // Left-Outer
                if (bevLeft && bevLeft.side.includes("Тил")) {
                  pts.push({ x: xLeft + dLeft, y: yBack });
                  pts.push({ x: xLeft, y: yBack - dLeft * step });
                } else {
                  pts.push({ x: xLeft, y: yBack });
                }
                
                return pts.map(pt => `${pt.x},${pt.y}`).join(' ');
              }

              let svg = '';

              // Common helper vars
              const bevTop = (p.bevels || []).find(b => b.side.includes("Верхня"));
              const bevBottom = (p.bevels || []).find(b => b.side.includes("Нижня"));
              const bevLeft = (p.bevels || []).find(b => b.side.includes("Ліва"));
              const bevRight = (p.bevels || []).find(b => b.side.includes("Права"));

              // ==========================================
              // 1. LEFT SIDE VIEW (W1)
              // ==========================================
              let svgLeft = '';
              const pointsLeft = buildVerticalPolygonPoints(-gap, -gap - lz*sc, -ly*sc, 0, bevTop, bevBottom, sc);
              svgLeft += `<defs><clipPath id="clip-left"><polygon points="${pointsLeft}" /></clipPath></defs>`;
              svgLeft += `<polygon points="${pointsLeft}" fill="${fillW1}" stroke="#000000" stroke-width="${1.2/zoom}" />`;
              svgLeft += `<g clip-path="url(#clip-left)">`;
              
              // build206: горизонтальний КРАЙОВИЙ паз (верхній/нижній торець, довгий уздовж X)
              // НЕ мусимо малювати як «наскрізну бокову прорізь» — його випадок обробляє
              // окремий блок isTopEdge/isBottomEdge нижче. Раніше умова «g.x <= 1.5» ловила
              // і його (торцевий паз по всій довжині починається з x=0) і малювала артефакт.
              const _isHorizEdgeGroove = (g) => {
                const exd = (g.dx !== undefined ? g.dx : g.l);
                const eyd = (g.dy !== undefined ? g.dy : g.w);
                const nearTop = g.side.includes("Верхня") || (g.y + g.w >= ly - 1.5);
                const nearBottom = g.side.includes("Нижня") || (g.y <= 1.5 && g.side.toUpperCase().includes("ТОР"));
                return exd > eyd && (nearTop || nearBottom);
              };

              (p.grooves || []).forEach(g => {
                if ((g.side.includes("Ліва") || g.x <= 1.5) && !_isHorizEdgeGroove(g)) {
                  const depth = g.h * sc;
                  const gy1 = -g.y * sc;
                  const gy2 = -(g.y + (g.dy !== undefined ? g.dy : g.w)) * sc;
                  const yMin = Math.min(gy1, gy2);
                  const yMax = Math.max(gy1, gy2);

                  if (g.side.includes("Тил")) {
                    svgLeft += `<rect x="${-gap - lz*sc}" y="${yMin}" width="${depth}" height="${yMax - yMin}" fill="#ffffff" />`;
                    svgLeft += `<line x1="${-gap - lz*sc}" y1="${yMin}" x2="${-gap - lz*sc}" y2="${yMax}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgLeft += `<path d="M ${-gap - lz*sc} ${yMin} L ${-gap - lz*sc + depth} ${yMin} L ${-gap - lz*sc + depth} ${yMax} L ${-gap - lz*sc}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgLeft += `<rect x="${-gap - depth}" y="${yMin}" width="${depth}" height="${yMax - yMin}" fill="#ffffff" />`;
                    svgLeft += `<line x1="${-gap}" y1="${yMin}" x2="${-gap}" y2="${yMax}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgLeft += `<path d="M ${-gap} ${yMin} L ${-gap - depth} ${yMin} L ${-gap - depth} ${yMax} L ${-gap}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
              });

              // build206: виріз торцевого паза у БОКОВІЙ проекції — раніше осі були переплутані
              // (width=глибина H, height=ширина W) і не враховувався відступ Z по товщині.
              // Правильно: паз шириною W ЛЕЖИТЬ У ТОВЩИНІ (горизонталь проекції) на відступі Z
              // від лицьової грані, і врізається від торця вглиб на H (вертикаль).
              (p.grooves || []).forEach(g => {
                const isTopEdge = g.side.includes("Верхня") || (g.y + g.w >= ly - 1.5);
                const isBottomEdge = g.side.includes("Нижня") || (g.y <= 1.5);
                const zOff = (g.z !== undefined ? g.z : 0) * sc;
                // build216: паз типу ТОР (виріз З ТОРЦЯ) має ПРОТИЛЕЖНИЙ сенс W/H порівняно
                // з ЛИЦ/ТИЛ (виріз з площини). Для ЛИЦ/ТИЛ: товщина вглиб плити = H, відступ
                // уздовж Y = W (build214). Для ТОР — навпаки: товщина (по товщині плити) = W,
                // глибина від торця уздовж Y = H. Одна формула на обидва типи розтягувала
                // ТОР-паз занадто широко впоперек товщини, і його обрізало межею товщини —
                // виглядало як відкрита чверть замість закритого центрованого паза.
                const isEdgeCut = g.side && g.side.toUpperCase().includes("ТОР");
                const wThReal = (isEdgeCut ? g.w : g.h) * sc;
                const dCutReal = (isEdgeCut ? g.h : g.w) * sc;
                const wTh = Math.max(wThReal, 6/zoom);
                const dCut = Math.max(dCutReal, 4/zoom);
                const x0 = -gap - zOff - wTh;
                const edgeStroke = Math.min(1.2, wTh / 3, dCut / 3) / zoom;
                if (isTopEdge && g.x <= 1.5) {
                  svgLeft += `<rect x="${x0}" y="${-ly*sc}" width="${wTh}" height="${dCut}" fill="#ffffff" />`;
                  svgLeft += `<line x1="${x0}" y1="${-ly*sc}" x2="${x0 + wTh}" y2="${-ly*sc}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                  svgLeft += `<path d="M ${x0} ${-ly*sc} L ${x0} ${-ly*sc + dCut} L ${x0 + wTh} ${-ly*sc + dCut} L ${x0 + wTh} ${-ly*sc}" stroke="#000000" stroke-width="${edgeStroke}" fill="none" />`;
                }
                if (isBottomEdge && g.x <= 1.5) {
                  svgLeft += `<rect x="${x0}" y="${-dCut}" width="${wTh}" height="${dCut}" fill="#ffffff" />`;
                  svgLeft += `<line x1="${x0}" y1="0" x2="${x0 + wTh}" y2="0" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                  svgLeft += `<path d="M ${x0} 0 L ${x0} ${-dCut} L ${x0 + wTh} ${-dCut} L ${x0 + wTh} 0" stroke="#000000" stroke-width="${edgeStroke}" fill="none" />`;
                }
              });

              (p.holes || []).forEach(h => {
                const rad_sc = (h.d / 2) * sc;
                const distLeft = h.x;
                const distRight = lx - h.x;
                const distBottom = h.y;
                const distTop = ly - h.y;
                const minDist = Math.min(distLeft, distRight, distBottom, distTop);

                if (h.side === 'ТОРЦ' && minDist === distLeft) {
                  const cx = -gap - lz*sc/2;
                  const cy = -h.y * sc;
                  svgLeft += `<circle cx="${cx}" cy="${cy}" r="${rad_sc}" stroke="#000000" stroke-width="${0.8/zoom}" fill="none" />`;
                  svgLeft += `<line x1="${cx - 3/zoom}" y1="${cy}" x2="${cx + 3/zoom}" y2="${cy}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                  svgLeft += `<line x1="${cx}" y1="${cy - 3/zoom}" x2="${cx}" y2="${cy + 3/zoom}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                } else if (h.side === 'ЛИЦЕВ' || h.side === 'ТИЛЬН') {
                  const rx = (h.side === 'ЛИЦЕВ') ? (-gap - h.h*sc) : (-gap - lz*sc);
                  const ry = -h.y * sc - rad_sc;
                  svgLeft += `<rect x="${rx}" y="${ry}" width="${h.h*sc}" height="${h.d*sc}" stroke="#000000" stroke-width="${0.8/zoom}" stroke-dasharray="${2/zoom},${2/zoom}" fill="none" />`;
                }
              });
              svgLeft += `</g>`;
              
               if (window.showOverallDims !== false) {
                 const dimX_L = -gap - lz*sc - 25/zoom;
                 svgLeft += `<line x1="${-gap - lz*sc - 5/zoom}" y1="${-ly*sc}" x2="${dimX_L - 5/zoom}" y2="${-ly*sc}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgLeft += `<line x1="${-gap - lz*sc - 5/zoom}" y1="0" x2="${dimX_L - 5/zoom}" y2="0" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgLeft += `<line x1="${dimX_L}" y1="${-ly*sc}" x2="${dimX_L}" y2="0" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgLeft += `<line x1="${dimX_L - 3/zoom}" y1="${-ly*sc + 3/zoom}" x2="${dimX_L + 3/zoom}" y2="${-ly*sc - 3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgLeft += `<line x1="${dimX_L - 3/zoom}" y1="${3/zoom}" x2="${dimX_L + 3/zoom}" y2="${-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgLeft += `<text x="${dimX_L - 8/zoom}" y="${-ly*sc/2}" font-family="Segoe UI, Arial" font-size="${10/zoom}" text-anchor="middle" dominant-baseline="central" fill="#333" font-weight="bold" transform="rotate(-90, ${dimX_L - 8/zoom}, ${-ly*sc/2})">${Math.round(ly)}</text>`;
               }

              // ==========================================
              // 2. RIGHT SIDE VIEW (W2)
              // ==========================================
              let svgRight = '';
              const pointsRight = buildVerticalPolygonPoints(lx*sc + gap, lx*sc + gap + lz*sc, -ly*sc, 0, bevTop, bevBottom, sc);
              svgRight += `<defs><clipPath id="clip-right"><polygon points="${pointsRight}" /></clipPath></defs>`;
              svgRight += `<polygon points="${pointsRight}" fill="${fillW2}" stroke="#000000" stroke-width="${1.2/zoom}" />`;
              svgRight += `<g clip-path="url(#clip-right)">`;
              
              (p.grooves || []).forEach(g => {
                if ((g.side.includes("Права") || g.x + g.l >= lx - 1.5) && !_isHorizEdgeGroove(g)) {
                   const depth = g.h * sc;
                  const gy1 = -g.y * sc;
                  const gy2 = -(g.y + (g.dy !== undefined ? g.dy : g.w)) * sc;
                  const yMin = Math.min(gy1, gy2);
                  const yMax = Math.max(gy1, gy2);

                  if (g.side.includes("Тил")) {
                    svgRight += `<rect x="${lx*sc + gap + lz*sc - depth}" y="${yMin}" width="${depth}" height="${yMax - yMin}" fill="#ffffff" />`;
                    svgRight += `<line x1="${lx*sc + gap + lz*sc}" y1="${yMin}" x2="${lx*sc + gap + lz*sc}" y2="${yMax}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgRight += `<path d="M ${lx*sc + gap + lz*sc} ${yMin} L ${lx*sc + gap + lz*sc - depth} ${yMin} L ${lx*sc + gap + lz*sc - depth} ${yMax} L ${lx*sc + gap + lz*sc}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgRight += `<rect x="${lx*sc + gap}" y="${yMin}" width="${depth}" height="${yMax - yMin}" fill="#ffffff" />`;
                    svgRight += `<line x1="${lx*sc + gap}" y1="${yMin}" x2="${lx*sc + gap}" y2="${yMax}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgRight += `<path d="M ${lx*sc + gap} ${yMin} L ${lx*sc + gap + depth} ${yMin} L ${lx*sc + gap + depth} ${yMax} L ${lx*sc + gap}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
              });

              // build206: віддзеркалення лівого виду — виріз торцевого паза з правильними осями
              // (ширина W по товщині на відступі Z від лицьової грані, глибина H від торця).
              (p.grooves || []).forEach(g => {
                const isTopEdge = g.side.includes("Верхня") || (g.y + g.w >= ly - 1.5);
                const isBottomEdge = g.side.includes("Нижня") || (g.y <= 1.5);
                const zOff = (g.z !== undefined ? g.z : 0) * sc;
                // build216: ТОР (виріз з торця) — товщина = W, глибина від торця уздовж Y = H;
                // ЛИЦ/ТИЛ (виріз з площини) — навпаки (товщина = H, відступ уздовж Y = W,
                // build214). Див. докладний коментар у лівому виді.
                const isEdgeCut = g.side && g.side.toUpperCase().includes("ТОР");
                const wThReal = (isEdgeCut ? g.w : g.h) * sc;
                const dCutReal = (isEdgeCut ? g.h : g.w) * sc;
                const wTh = Math.max(wThReal, 6/zoom);
                const dCut = Math.max(dCutReal, 4/zoom);
                const x0 = lx*sc + gap + zOff; // права полоса: лицьова грань = lx*sc + gap

                const edgeStroke = Math.min(1.2, wTh / 3, dCut / 3) / zoom;
                if (isTopEdge && g.x + g.l >= lx - 1.5) {
                  svgRight += `<rect x="${x0}" y="${-ly*sc}" width="${wTh}" height="${dCut}" fill="#ffffff" />`;
                  svgRight += `<line x1="${x0}" y1="${-ly*sc}" x2="${x0 + wTh}" y2="${-ly*sc}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                  svgRight += `<path d="M ${x0} ${-ly*sc} L ${x0} ${-ly*sc + dCut} L ${x0 + wTh} ${-ly*sc + dCut} L ${x0 + wTh} ${-ly*sc}" stroke="#000000" stroke-width="${edgeStroke}" fill="none" />`;
                }
                if (isBottomEdge && g.x + g.l >= lx - 1.5) {
                  svgRight += `<rect x="${x0}" y="${-dCut}" width="${wTh}" height="${dCut}" fill="#ffffff" />`;
                  svgRight += `<line x1="${x0}" y1="0" x2="${x0 + wTh}" y2="0" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                  svgRight += `<path d="M ${x0} 0 L ${x0} ${-dCut} L ${x0 + wTh} ${-dCut} L ${x0 + wTh} 0" stroke="#000000" stroke-width="${edgeStroke}" fill="none" />`;
                }
              });

              (p.holes || []).forEach(h => {
                const rad_sc = (h.d / 2) * sc;
                const distLeft = h.x;
                const distRight = lx - h.x;
                const distBottom = h.y;
                const distTop = ly - h.y;
                const minDist = Math.min(distLeft, distRight, distBottom, distTop);

                if (h.side === 'ТОРЦ' && minDist === distRight) {
                  const cx = lx*sc + gap + lz*sc/2;
                  const cy = -h.y * sc;
                  svgRight += `<circle cx="${cx}" cy="${cy}" r="${rad_sc}" stroke="#000000" stroke-width="${0.8/zoom}" fill="none" />`;
                  svgRight += `<line x1="${cx - 3/zoom}" y1="${cy}" x2="${cx + 3/zoom}" y2="${cy}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                  svgRight += `<line x1="${cx}" y1="${cy - 3/zoom}" x2="${cx}" y2="${cy + 3/zoom}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                } else if (h.side === 'ЛИЦЕВ' || h.side === 'ТИЛЬН') {
                  const rx = (h.side === 'ЛИЦЕВ') ? (lx*sc + gap) : (lx*sc + gap + lz*sc - h.h*sc);
                  const ry = -h.y * sc - rad_sc;
                  svgRight += `<rect x="${rx}" y="${ry}" width="${h.h*sc}" height="${h.d*sc}" stroke="#000000" stroke-width="${0.8/zoom}" stroke-dasharray="${2/zoom},${2/zoom}" fill="none" />`;
                }
              });
              svgRight += `</g>`;
              
               if (window.showOverallDims !== false) {
                 const dimX_R = lx*sc + gap + lz*sc + 25/zoom;
                 svgRight += `<line x1="${lx*sc + gap + lz*sc + 5/zoom}" y1="${-ly*sc}" x2="${dimX_R + 5/zoom}" y2="${-ly*sc}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgRight += `<line x1="${lx*sc + gap + lz*sc + 5/zoom}" y1="0" x2="${dimX_R + 5/zoom}" y2="0" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgRight += `<line x1="${dimX_R}" y1="${-ly*sc}" x2="${dimX_R}" y2="0" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgRight += `<line x1="${dimX_R - 3/zoom}" y1="${-ly*sc + 3/zoom}" x2="${dimX_R + 3/zoom}" y2="${-ly*sc - 3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgRight += `<line x1="${dimX_R - 3/zoom}" y1="${3/zoom}" x2="${dimX_R + 3/zoom}" y2="${-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgRight += `<text x="${dimX_R + 8/zoom}" y="${-ly*sc/2}" font-family="Segoe UI, Arial" font-size="${10/zoom}" text-anchor="middle" dominant-baseline="central" fill="#333" font-weight="bold" transform="rotate(90, ${dimX_R + 8/zoom}, ${-ly*sc/2})">${Math.round(ly)}</text>`;
               }

              // ==========================================
              // 3. TOP SIDE VIEW (L2)
              // ==========================================
              let svgTop = '';
              const pointsTop = buildHorizontalPolygonPoints(-ly*sc - gap, -ly*sc - gap - lz*sc, 0, lx*sc, bevLeft, bevRight, sc);
              svgTop += `<defs><clipPath id="clip-top"><polygon points="${pointsTop}" /></clipPath></defs>`;
              svgTop += `<polygon points="${pointsTop}" fill="${fillL2}" stroke="#000000" stroke-width="${1.2/zoom}" />`;
              svgTop += `<g clip-path="url(#clip-top)">`;
              
              (p.grooves || []).forEach(g => {
                if (g.side.includes("Верхня") || g.y + g.w >= ly - 1.5) {
                  const depth = g.h * sc;
                  const gx1 = g.x * sc;
                  const gx2 = (g.x + (g.dx !== undefined ? g.dx : g.l)) * sc;
                  const xMin = Math.min(gx1, gx2);
                  const xMax = Math.max(gx1, gx2);
                  
                  if (g.side.includes("Тил")) {
                    svgTop += `<rect x="${xMin}" y="${-ly*sc - gap - lz*sc}" width="${xMax - xMin}" height="${depth}" fill="#ffffff" />`;
                    svgTop += `<line x1="${xMin}" y1="${-ly*sc - gap - lz*sc}" x2="${xMax}" y2="${-ly*sc - gap - lz*sc}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgTop += `<path d="M ${xMin} ${-ly*sc - gap - lz*sc} L ${xMin} ${-ly*sc - gap - lz*sc + depth} L ${xMax} ${-ly*sc - gap - lz*sc + depth} L ${xMax} ${-ly*sc - gap - lz*sc}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgTop += `<rect x="${xMin}" y="${-ly*sc - gap - depth}" width="${xMax - xMin}" height="${depth}" fill="#ffffff" />`;
                    svgTop += `<line x1="${xMin}" y1="${-ly*sc - gap}" x2="${xMax}" y2="${-ly*sc - gap}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgTop += `<path d="M ${xMin} ${-ly*sc - gap} L ${xMin} ${-ly*sc - gap - depth} L ${xMax} ${-ly*sc - gap - depth} L ${xMax} ${-ly*sc - gap}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
              });

              (p.grooves || []).forEach(g => {
                const isLeftEdge = g.side.includes("Ліва") || (g.x <= 1.5);
                const isRightEdge = g.side.includes("Права") || (g.x + g.l >= lx - 1.5);
                
                if (isLeftEdge && g.y + g.w >= ly - 1.5) {
                  const depth = g.h * sc;
                  const w_sc = g.w * sc;
                  if (g.side.includes("Тил")) {
                    svgTop += `<rect x="0" y="${-ly*sc - gap - lz*sc}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgTop += `<line x1="0" y1="${-ly*sc - gap - lz*sc}" x2="0" y2="${-ly*sc - gap - lz*sc + depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgTop += `<path d="M ${w_sc} ${-ly*sc - gap - lz*sc} L ${w_sc} ${-ly*sc - gap - lz*sc + depth} L 0 ${-ly*sc - gap - lz*sc + depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgTop += `<rect x="0" y="${-ly*sc - gap - depth}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgTop += `<line x1="0" y1="${-ly*sc - gap}" x2="0" y2="${-ly*sc - gap - depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgTop += `<path d="M ${w_sc} ${-ly*sc - gap} L ${w_sc} ${-ly*sc - gap - depth} L 0 ${-ly*sc - gap - depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
                if (isRightEdge && g.y + g.w >= ly - 1.5) {
                  const depth = g.h * sc;
                  const w_sc = g.w * sc;
                  if (g.side.includes("Тил")) {
                    svgTop += `<rect x="${lx*sc - w_sc}" y="${-ly*sc - gap - lz*sc}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgTop += `<line x1="${lx*sc}" y1="${-ly*sc - gap - lz*sc}" x2="${lx*sc}" y2="${-ly*sc - gap - lz*sc + depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgTop += `<path d="M ${lx*sc - w_sc} ${-ly*sc - gap - lz*sc} L ${lx*sc - w_sc} ${-ly*sc - gap - lz*sc + depth} L ${lx*sc} ${-ly*sc - gap - lz*sc + depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgTop += `<rect x="${lx*sc - w_sc}" y="${-ly*sc - gap - depth}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgTop += `<line x1="${lx*sc}" y1="${-ly*sc - gap}" x2="${lx*sc}" y2="${-ly*sc - gap - depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgTop += `<path d="M ${lx*sc - w_sc} ${-ly*sc - gap} L ${lx*sc - w_sc} ${-ly*sc - gap - depth} L ${lx*sc} ${-ly*sc - gap - depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
              });

              (p.holes || []).forEach(h => {
                const rad_sc = (h.d / 2) * sc;
                const distLeft = h.x;
                const distRight = lx - h.x;
                const distBottom = h.y;
                const distTop = ly - h.y;
                const minDist = Math.min(distLeft, distRight, distBottom, distTop);

                if (h.side === 'ТОРЦ' && minDist === distTop) {
                  const cx = h.x * sc;
                  const cy = -ly*sc - gap - lz*sc/2;
                  svgTop += `<circle cx="${cx}" cy="${cy}" r="${rad_sc}" stroke="#000000" stroke-width="${0.8/zoom}" fill="none" />`;
                  svgTop += `<line x1="${cx - 3/zoom}" y1="${cy}" x2="${cx + 3/zoom}" y2="${cy}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                  svgTop += `<line x1="${cx}" y1="${cy - 3/zoom}" x2="${cx}" y2="${cy + 3/zoom}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                } else if (h.side === 'ЛИЦЕВ' || h.side === 'ТИЛЬН') {
                  const rx = h.x * sc - rad_sc;
                  const ry = (h.side === 'ЛИЦЕВ') ? (-ly*sc - gap - h.h*sc) : (-ly*sc - gap - lz*sc);
                  svgTop += `<rect x="${rx}" y="${ry}" width="${h.d*sc}" height="${h.h*sc}" stroke="#000000" stroke-width="${0.8/zoom}" stroke-dasharray="${2/zoom},${2/zoom}" fill="none" />`;
                }
              });
              svgTop += `</g>`;

               if (window.showOverallDims !== false) {
                 const dimY_T = -ly*sc - gap - lz*sc - 25/zoom;
                 svgTop += `<line x1="0" y1="${-ly*sc - gap - lz*sc - 5/zoom}" x2="0" y2="${dimY_T - 5/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgTop += `<line x1="${lx*sc}" y1="${-ly*sc - gap - lz*sc - 5/zoom}" x2="${lx*sc}" y2="${dimY_T - 5/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgTop += `<line x1="0" y1="${dimY_T}" x2="${lx*sc}" y2="${dimY_T}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgTop += `<line x1="${-3/zoom}" y1="${dimY_T + 3/zoom}" x2="${3/zoom}" y2="${dimY_T - 3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgTop += `<line x1="${lx*sc - 3/zoom}" y1="${dimY_T + 3/zoom}" x2="${lx*sc + 3/zoom}" y2="${dimY_T - 3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgTop += `<text x="${lx*sc/2}" y="${dimY_T - 8/zoom}" font-family="Segoe UI, Arial" font-size="${10/zoom}" text-anchor="middle" dominant-baseline="central" fill="#333" font-weight="bold">${Math.round(lx)}</text>`;
               }

              // ==========================================
              // 4. BOTTOM SIDE VIEW (L1)
              // ==========================================
              let svgBottom = '';
              const pointsBottom = buildHorizontalPolygonPoints(gap, gap + lz*sc, 0, lx*sc, bevLeft, bevRight, sc);
              svgBottom += `<defs><clipPath id="clip-bottom"><polygon points="${pointsBottom}" /></clipPath></defs>`;
              svgBottom += `<polygon points="${pointsBottom}" fill="${fillL1}" stroke="#000000" stroke-width="${1.2/zoom}" />`;
              svgBottom += `<g clip-path="url(#clip-bottom)">`;
              
              if (bevBottom) {
                let off_sc = (bevBottom.off !== undefined ? bevBottom.off : 1.0) * sc;
                let lineY = bevBottom.side.includes("Лиц") ? (gap + lz*sc - off_sc) : (gap + off_sc);
                svgBottom += `<line x1="0" y1="${lineY}" x2="${lx*sc}" y2="${lineY}" stroke="#000000" stroke-width="${0.5/zoom}" />`;
              }
              
              if (bevRight) {
                let off_sc = (bevRight.off !== undefined ? bevRight.off : 1.0) * sc;
                let isBack = bevRight.side.includes("Тил");
                let vX = lx*sc;
                let vY1 = isBack ? gap : (gap + lz*sc - off_sc);
                let vY2 = isBack ? (gap + off_sc) : (gap + lz*sc);
                svgBottom += dimLine(vX, vY1, vX, vY2, bevRight.off, 18/zoom, true);
              }
              if (bevLeft) {
                let off_sc = (bevLeft.off !== undefined ? bevLeft.off : 1.0) * sc;
                let isBack = bevLeft.side.includes("Тил");
                let vX = 0;
                let vY1 = isBack ? gap : (gap + lz*sc - off_sc);
                let vY2 = isBack ? (gap + off_sc) : (gap + lz*sc);
                svgBottom += dimLine(vX, vY1, vX, vY2, bevLeft.off, -18/zoom, true);
              }

              (p.grooves || []).forEach(g => {
                if (g.side.includes("Нижня") || g.y <= 1.5) {
                  const depth = g.h * sc;
                  const gx1 = g.x * sc;
                  const gx2 = (g.x + (g.dx !== undefined ? g.dx : g.l)) * sc;
                  const xMin = Math.min(gx1, gx2);
                  const xMax = Math.max(gx1, gx2);
                  
                  if (g.side.includes("Тил")) {
                    svgBottom += `<rect x="${xMin}" y="${gap + lz*sc - depth}" width="${xMax - xMin}" height="${depth}" fill="#ffffff" />`;
                    svgBottom += `<line x1="${xMin}" y1="${gap + lz*sc}" x2="${xMax}" y2="${gap + lz*sc}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgBottom += `<path d="M ${xMin} ${gap + lz*sc} L ${xMin} ${gap + lz*sc - depth} L ${xMax} ${gap + lz*sc - depth} L ${xMax} ${gap + lz*sc}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgBottom += `<rect x="${xMin}" y="${gap}" width="${xMax - xMin}" height="${depth}" fill="#ffffff" />`;
                    svgBottom += `<line x1="${xMin}" y1="${gap}" x2="${xMax}" y2="${gap}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgBottom += `<path d="M ${xMin} ${gap} L ${xMin} ${gap + depth} L ${xMax} ${gap + depth} L ${xMax} ${gap}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
              });

              (p.grooves || []).forEach(g => {
                const isLeftEdge = g.side.includes("Ліва") || (g.x <= 1.5);
                const isRightEdge = g.side.includes("Права") || (g.x + g.l >= lx - 1.5);
                
                if (isLeftEdge && g.y <= 1.5) {
                  const depth = g.h * sc;
                  const w_sc = g.w * sc;
                  if (g.side.includes("Тил")) {
                    svgBottom += `<rect x="0" y="${gap + lz*sc - depth}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgBottom += `<line x1="0" y1="${gap + lz*sc}" x2="0" y2="${gap + lz*sc - depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgBottom += `<path d="M ${w_sc} ${gap + lz*sc} L ${w_sc} ${gap + lz*sc - depth} L 0 ${gap + lz*sc - depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgBottom += `<rect x="0" y="${gap}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgBottom += `<line x1="0" y1="${gap}" x2="0" y2="${gap + depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgBottom += `<path d="M ${w_sc} ${gap} L ${w_sc} ${gap + depth} L 0 ${gap + depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
                if (isRightEdge && g.y <= 1.5) {
                  const depth = g.h * sc;
                  const w_sc = g.w * sc;
                  if (g.side.includes("Тил")) {
                    svgBottom += `<rect x="${lx*sc - w_sc}" y="${gap + lz*sc - depth}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgBottom += `<line x1="${lx*sc}" y1="${gap + lz*sc}" x2="${lx*sc}" y2="${gap + lz*sc - depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgBottom += `<path d="M ${lx*sc - w_sc} ${gap + lz*sc} L ${lx*sc - w_sc} ${gap + lz*sc - depth} L ${lx*sc} ${gap + lz*sc - depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  } else {
                    svgBottom += `<rect x="${lx*sc - w_sc}" y="${gap}" width="${w_sc}" height="${depth}" fill="#ffffff" />`;
                    svgBottom += `<line x1="${lx*sc}" y1="${gap}" x2="${lx*sc}" y2="${gap + depth}" stroke="#ffffff" stroke-width="${2.0/zoom}" />`;
                    svgBottom += `<path d="M ${lx*sc - w_sc} ${gap} L ${lx*sc - w_sc} ${gap + depth} L ${lx*sc} ${gap + depth}" stroke="#000000" stroke-width="${1.2/zoom}" fill="none" />`;
                  }
                }
              });

              (p.holes || []).forEach(h => {
                const rad_sc = (h.d / 2) * sc;
                const distLeft = h.x;
                const distRight = lx - h.x;
                const distBottom = h.y;
                const distTop = ly - h.y;
                const minDist = Math.min(distLeft, distRight, distBottom, distTop);

                if (h.side === 'ТОРЦ' && minDist === distBottom) {
                  const cx = h.x * sc;
                  const cy = gap + lz*sc/2;
                  svgBottom += `<circle cx="${cx}" cy="${cy}" r="${rad_sc}" stroke="#000000" stroke-width="${0.8/zoom}" fill="none" />`;
                  svgBottom += `<line x1="${cx - 3/zoom}" y1="${cy}" x2="${cx + 3/zoom}" y2="${cy}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                  svgBottom += `<line x1="${cx}" y1="${cy - 3/zoom}" x2="${cx}" y2="${cy + 3/zoom}" stroke="#000000" stroke-width="${0.4/zoom}" />`;
                } else if (h.side === 'ЛИЦЕВ' || h.side === 'ТИЛЬН') {
                  const rx = h.x * sc - rad_sc;
                  const ry = (h.side === 'ЛИЦЕВ') ? gap : (gap + lz*sc - h.h*sc);
                  svgBottom += `<rect x="${rx}" y="${ry}" width="${h.d*sc}" height="${h.h*sc}" stroke="#000000" stroke-width="${0.8/zoom}" stroke-dasharray="${2/zoom},${2/zoom}" fill="none" />`;
                }
              });
              svgBottom += `</g>`;

               if (window.showOverallDims !== false) {
                  const dimY_B = gap + lz*sc + 25/zoom;
                 svgBottom += `<line x1="0" y1="${gap + lz*sc + 5/zoom}" x2="0" y2="${dimY_B + 5/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgBottom += `<line x1="${lx*sc}" y1="${gap + lz*sc + 5/zoom}" x2="${lx*sc}" y2="${dimY_B + 5/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgBottom += `<line x1="0" y1="${dimY_B}" x2="${lx*sc}" y2="${dimY_B}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgBottom += `<line x1="${-3/zoom}" y1="${dimY_B + 3/zoom}" x2="${3/zoom}" y2="${dimY_B - 3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgBottom += `<line x1="${lx*sc - 3/zoom}" y1="${dimY_B + 3/zoom}" x2="${lx*sc + 3/zoom}" y2="${dimY_B - 3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                 svgBottom += `<text x="${lx*sc/2}" y="${dimY_B + 8/zoom}" font-family="Segoe UI, Arial" font-size="${10/zoom}" text-anchor="middle" dominant-baseline="central" fill="#333" font-weight="bold">${Math.round(lx)}</text>`;
               }

              svg += svgLeft + svgRight + svgTop + svgBottom;
              
              return svg;
            }


              function generateSVGHtml(p, zoomState, isPrint) {
                var zoom = zoomState ? zoomState.zoom : 1.0;
                var offX = zoomState ? zoomState.offX : 0;
                var offY = zoomState ? zoomState.offY : 0;

               // build205: 0.9 → 0.6, як у діалозі «Креслення деталей (А4)» — звільняє місце під
               // бокові проекції (getSideViewSVG) і габаритні розміри навколо деталі.
               var sc = Math.min(760/p.l, 590/p.w, 2.5) * 0.6;
               var transX = 461/zoom - (p.l*sc)/2;
                var transY = 435/zoom + (p.w*sc)/2;

                let uniqueProfiles = [];
                if (window.drawGrooveSections) {
                  let letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯ";
                  let lIdx = 0;
                  if (p.grooves && p.grooves.length > 0) {
                    p.grooves.forEach((g) => {
                      let profileKey = `G_${g.w}_${g.h}_${g.z !== undefined ? g.z : 0}_${g.side}_${g.x}_${g.y}`;
                      let existing = uniqueProfiles.find(x => x.key === profileKey);
                      if (!existing) {
                        existing = { key: profileKey, type: 'groove', letter: letters[lIdx % letters.length], w: g.w, h: g.h, z: g.z !== undefined ? g.z : 0, side: g.side, x: g.x, y: g.y, idx: lIdx };
                        uniqueProfiles.push(existing);
                        lIdx++;
                      }
                      g.profileLetter = existing.letter;
                    });
                  }
                  if (p.bevels && p.bevels.length > 0) {
                    p.bevels.forEach((b) => {
                      let normSide = b.side ? b.side.replace(/(Права|Ліва|Верхня|Нижня)(,\s*)?/g, '').trim() : '';
                      let profileKey = `B_${b.off}_${b.a}_${normSide}`;
                      let existing = uniqueProfiles.find(x => x.key === profileKey);
                      if (!existing) {
                        existing = { key: profileKey, type: 'bevel', letter: letters[lIdx % letters.length], off: b.off, a: b.a, side: b.side, idx: lIdx };
                        uniqueProfiles.push(existing);
                        lIdx++;
                      }
                      b.profileLetter = existing.letter;
                    });
                  }
                }

               var svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1122" height="794" viewBox="0 0 1122 794" style="width:1122px; height:794px; position:absolute; top:0; left:0;">`;
               svg += `<defs>
                  <pattern id="hatchPattern" patternUnits="userSpaceOnUse" width="8" height="8">
                    <path d="M 0 0 L 8 8 M 8 0 L 0 8" stroke="#e67e22" stroke-width="0.5"/>
                  </pattern>
                  <pattern id="hatch_blue" width="${10/zoom}" height="${10/zoom}" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="${10/zoom}" stroke="#0000ff" stroke-width="${1/zoom}" />
                  </pattern>
                  <pattern id="hatch_blue_static" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#0000ff" stroke-width="1" />
                  </pattern>
                </defs>`;
               svg += `<g transform="translate(${offX}, ${offY}) scale(${zoom})">`;
               svg += `<g transform="translate(${transX}, ${transY})">`;


                // Labels / Axis - REMOVED to hide coordinate system watermark
                // if (p.labels && p.labels.length > 0) {
                //   let d = '';
                //   p.labels.forEach(s => { d += `M ${s.x1*sc} ${-s.y1*sc} L ${s.x2*sc} ${-s.y2*sc} `; });
                //   svg += `<path d="${d}" stroke="rgba(0,0,0,0.15)" stroke-width="${0.3/zoom}" fill="none" />`;
                // }

                // Part Contour Lines
                if (p.lines && p.lines.length > 0) {
                  let d = '';
                  p.lines.forEach(s => { d += `M ${s.x1*sc} ${-s.y1*sc} L ${s.x2*sc} ${-s.y2*sc} `; });
                  svg += `<path d="${d}" stroke="#000" stroke-width="${1.2/zoom}" fill="none" />`;
                }

                // Edge bands & Bevels (Viyar style)
                if (p.edge_bands) {
                  let ebThick = 4 / zoom;
                  let offB = 2 / zoom;
                  const getEdgeColor = (name) => {
                    if (!name || name === "" || name === "0") return null;
                    const n = name.toLowerCase();
                    if (n.includes('0.4') || n.includes('0.5') || n.includes('0.6')) return '#2ca02c';
                    if (n.includes('0.8')) return '#ff7f0e';
                    if (n.includes('1.0') || n.includes('1 ')) return '#aec7e8';
                    if (n.includes('2.0') || n.includes('2 ') || n.includes('2мм')) return '#800080';
                    return '#ff7f0e';
                  };
                  
                  let cL1 = getEdgeColor(p.edge_bands.L1);
                  if (cL1) svg += `<rect x="0" y="${offB}" width="${p.l*sc}" height="${ebThick}" fill="${cL1}" />`;
                  
                  let cL2 = getEdgeColor(p.edge_bands.L2);
                  if (cL2) svg += `<rect x="0" y="${-p.w*sc - ebThick - offB}" width="${p.l*sc}" height="${ebThick}" fill="${cL2}" />`;
                  
                  let cW1 = getEdgeColor(p.edge_bands.W1);
                  if (cW1) svg += `<rect x="${-ebThick - offB}" y="${-p.w*sc}" width="${ebThick}" height="${p.w*sc}" fill="${cW1}" />`;
                  
                  let cW2 = getEdgeColor(p.edge_bands.W2);
                  if (cW2) svg += `<rect x="${p.l*sc + offB}" y="${-p.w*sc}" width="${ebThick}" height="${p.w*sc}" fill="${cW2}" />`;
                }

                if (p.bevels && p.bevels.length > 0) {
                  p.bevels.forEach(b => {
                    let side = b.side || "";
                    let bx = 0, by = 0, bw = 0, bh = 0;
                    
                    let pt = p.t || 18;
                    let boff = b.off !== undefined ? b.off : 1.0;
                    let ba = b.a !== undefined ? b.a : 45.0;
                    let depth = pt - boff;
                    if (depth < 0) depth = 0;
                    let a_rad = Math.abs(ba) * Math.PI / 180;
                    let bevThick = depth * Math.tan(a_rad) * sc;
                    if (bevThick < 3/zoom) bevThick = 3/zoom; // min visible thickness
                    
                    if (side.includes("Права")) { bx = p.l*sc - bevThick; by = -p.w*sc; bw = bevThick; bh = p.w*sc; }
                    else if (side.includes("Ліва")) { bx = 0; by = -p.w*sc; bw = bevThick; bh = p.w*sc; }
                    else if (side.includes("Верхня")) { bx = 0; by = -p.w*sc; bw = p.l*sc; bh = bevThick; }
                    else if (side.includes("Нижня")) { bx = 0; by = -bevThick; bw = p.l*sc; bh = bevThick; }
                    
                    if (bw > 0 && bh > 0) {
                      svg += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="url(#hatchPattern)" stroke="#e67e22" stroke-width="${1/zoom}" />`;
                    }
                  });
                }

                let calloutItems = [];

                if (p.holes && p.holes.length > 0) {
                  p.holes.forEach((h, idx) => {
                    let px = h.x * sc;
                    let py = -h.y * sc;
                    let rad_sc = (h.d / 2) * sc;
                    let depth_sc = h.h * sc;
                    let dia_sc = h.d * sc;

                    let distLeft = h.x;
                    let distRight = p.l - h.x;
                    let distBottom = h.y;
                    let distTop = p.w - h.y;
                    let minDist = Math.min(distLeft, distRight, distBottom, distTop);
                    let sideGroup = 'bottom';

                    if (h.side === 'ТОРЦ') {
                      let rx = 0, ry = 0, rw = 0, rh = 0;
                      let clX1, clY1, clX2, clY2;
                      if (minDist === distLeft) {
                        rx = 0; ry = py - rad_sc; rw = depth_sc; rh = dia_sc;
                        sideGroup = 'left';
                      } else if (minDist === distRight) {
                        rx = p.l*sc - depth_sc; ry = py - rad_sc; rw = depth_sc; rh = dia_sc;
                        sideGroup = 'right';
                      } else if (minDist === distBottom) {
                        rx = px - rad_sc; ry = -depth_sc; rw = dia_sc; rh = depth_sc;
                        sideGroup = 'bottom';
                      } else {
                        rx = px - rad_sc; ry = -p.w*sc; rw = dia_sc; rh = depth_sc;
                        sideGroup = 'top';
                      }
                      
                      svg += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" stroke="#000" stroke-width="${0.8/zoom}" stroke-dasharray="${1.5/zoom},${1.5/zoom}" fill="rgba(0,0,0,0.03)" />`;
                    } else {
                      let dash = (h.side === 'ТИЛЬН') ? `stroke-dasharray="${4/zoom},${4/zoom}"` : '';
                      svg += `<circle cx="${px}" cy="${py}" r="${rad_sc}" stroke="#000" stroke-width="${0.8/zoom}" ${dash} fill="none" />`;
                      if (minDist === distLeft) sideGroup = 'left';
                      else if (minDist === distRight) sideGroup = 'right';
                      else if (minDist === distTop) sideGroup = 'top';
                      else sideGroup = 'bottom';
                    }

                    calloutItems.push({ isGroove: false, idx: idx, h: h, px: px, py: py, sideGroup: sideGroup });
                  });
                }

                if (p.grooves && p.grooves.length > 0) {
                  let uniqueProfiles = {};
                  if (window.drawGrooveSections) {
                    let letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯ";
                    let lIdx = 0;
                    p.grooves.forEach((g) => {
                      let profileKey = `${g.w}_${g.h}_${g.z !== undefined ? g.z : 0}_${g.side}`;
                      if (!uniqueProfiles[profileKey]) {
                        uniqueProfiles[profileKey] = {
                          letter: letters[lIdx % letters.length],
                          w: g.w, h: g.h, z: g.z !== undefined ? g.z : 0, side: g.side, idx: lIdx
                        };
                        lIdx++;
                      }
                      g.profileLetter = uniqueProfiles[profileKey].letter;
                    });
                  }

                  p.grooves.forEach((g, idx) => {
                    let drawX = g.draw_x !== undefined ? g.draw_x : g.x;
                    let drawY = g.draw_y !== undefined ? g.draw_y : g.y;
                    let gx = drawX * sc;
                    let gw = (g.dx !== undefined ? g.dx : g.l) * sc;
                    let gh = (g.dy !== undefined ? g.dy : g.w) * sc;
                    let rectY = -(drawY + (g.dy !== undefined ? g.dy : g.w)) * sc;
                    let dashArray = (g.side === 'ТИЛЬН') ? `stroke-dasharray="${4/zoom},${4/zoom}"` : "";
                    svg += `<rect x="${gx}" y="${rectY}" width="${gw}" height="${gh}" stroke="#000000" stroke-width="${1.0/zoom}" ${dashArray} fill="rgba(0,0,0,0.12)" />`;

                    let gcx_mm = drawX + (g.dx !== undefined ? g.dx : g.l) / 2;
                    let gcy_mm = drawY + (g.dy !== undefined ? g.dy : g.w) / 2;
                    let isEdgeGroove = (g.raw_w !== undefined ? g.raw_w <= 0.5 : (g.w <= 1.0 || g.y <= 0.5 || Math.abs(g.y - p.w) <= 0.5 || g.x <= 0.5 || Math.abs(g.x - p.l) <= 0.5));
                    
                    let sideGroup = 'bottom';
                    let gcx = gcx_mm * sc;
                    let gcy = -gcy_mm * sc;

                    if (isEdgeGroove) {
                      if (Math.abs(g.y - p.w) <= 2.0) {
                        sideGroup = 'top'; gcx = gcx_mm * sc; gcy = -p.w * sc;
                      } else if (g.y <= 2.0) {
                        sideGroup = 'bottom'; gcx = gcx_mm * sc; gcy = 0;
                      } else if (Math.abs(g.x - p.l) <= 2.0) {
                        sideGroup = 'right'; gcx = p.l * sc; gcy = -gcy_mm * sc;
                      } else {
                        sideGroup = 'left'; gcx = 0; gcy = -gcy_mm * sc;
                      }
                    } else {
                      let distLeft = gcx_mm;
                      let distRight = p.l - gcx_mm;
                      let distBottom = gcy_mm;
                      let distTop = p.w - gcy_mm;
                      let minDist = Math.min(distLeft, distRight, distBottom, distTop);
                      if (minDist === distLeft) sideGroup = 'left';
                      else if (minDist === distRight) sideGroup = 'right';
                      else if (minDist === distTop) sideGroup = 'top';
                      else sideGroup = 'bottom';
                    }

                    calloutItems.push({ isGroove: true, idx: idx, g: g, px: gcx, py: gcy, sideGroup: sideGroup });
                  });
                }

                if (p.bevels && p.bevels.length > 0) {
                  p.bevels.forEach((b, idx) => {
                    let sideGroup = 'top';
                    let px = p.l * sc / 2;
                    let py = -p.w * sc;
                    
                    if (b.side.includes("Верхня")) {
                      sideGroup = 'top'; px = p.l * sc / 2; py = -p.w * sc;
                    } else if (b.side.includes("Нижня")) {
                      sideGroup = 'bottom'; px = p.l * sc / 2; py = 0;
                    } else if (b.side.includes("Ліва")) {
                      sideGroup = 'left'; px = 0; py = -p.w * sc / 2;
                    } else if (b.side.includes("Права")) {
                      sideGroup = 'right'; px = p.l * sc; py = -p.w * sc / 2;
                    }
                    
                    calloutItems.push({ isGroove: false, isBevel: true, idx: idx, b: b, px: px, py: py, sideGroup: sideGroup });
                  });
                }

                if (calloutItems.length > 0) {
                  let groups = { top: [], bottom: [], left: [], right: [] };
                  calloutItems.forEach(item => groups[item.sideGroup].push(item));

                  let minSep = 24 / zoom;

                  let layoutTopBottomGroup = (arr, baseTy) => {
                    if (arr.length === 0) return;
                    arr.sort((a, b) => a.px - b.px);
                    arr.forEach((item) => {
                      item.tx = item.px;
                      item.ty = baseTy;
                    });
                    for (let iter = 0; iter < 20; iter++) {
                      let moved = false;
                      for (let i = 0; i < arr.length - 1; i++) {
                        if (arr[i+1].tx - arr[i].tx < minSep) {
                          let overlap = minSep - (arr[i+1].tx - arr[i].tx);
                          arr[i].tx -= overlap / 2;
                          arr[i+1].tx += overlap / 2;
                          moved = true;
                        }
                      }
                      if (!moved) break;
                    }
                  };

                  let layoutVerticalGroup = (arr, baseTx) => {
                    if (arr.length === 0) return;
                    let byY = {};
                    arr.forEach(item => {
                      let key = Math.round(item.py / 12) * 12;
                      if (!byY[key]) byY[key] = [];
                      byY[key].push(item);
                    });
                    Object.keys(byY).forEach(yKey => {
                      let rowItems = byY[yKey];
                      rowItems.sort((a, b) => (a.isGroove ? 1 : 0) - (b.isGroove ? 1 : 0) || a.idx - b.idx);
                      rowItems.forEach((item, k) => {
                        item.tx = (baseTx >= 0) ? (baseTx + k * minSep) : (baseTx - k * minSep);
                        item.ty = item.py;
                      });
                    });
                  };

                  layoutTopBottomGroup(groups.top, -p.w * sc - 30 / zoom);
                  layoutTopBottomGroup(groups.bottom, 30 / zoom);
                  layoutVerticalGroup(groups.left, -30 / zoom);
                  layoutVerticalGroup(groups.right, p.l * sc + 30 / zoom);

                  // Render Leader Lines and Drag Labels for all items
                  calloutItems.forEach(item => {
                    let key = p.id + '_' + (item.isGroove ? 'g_' : (item.isBevel ? 'b_' : '')) + item.idx;
                    if (hiddenItems[key]) return;
                    let off = holeOffsets[key] || { dx: 0, dy: 0 };
                    let lx = item.tx + off.dx;
                    let ly = item.ty + off.dy;
                    let strNum = item.isGroove ? ('П' + (item.idx + 1)) : String(item.idx + 1);
                    if (item.isBevel) {
                      strNum = 'З' + (item.idx + 1);
                    }
                    if (item.isGroove && window.drawGrooveSections && item.g.profileLetter) {
                      strNum = item.g.profileLetter;
                    }
                    if (item.isBevel && window.drawGrooveSections && item.b.profileLetter) {
                      strNum = item.b.profileLetter;
                    }
                    let color = (item.isGroove || item.isBevel) ? "#000000" : "#1a6b46";
                    let dash = `stroke-dasharray="${4/zoom},${4/zoom}"`;

                    // Leader line
                    svg += `<line x1="${item.px}" y1="${item.py}" x2="${lx}" y2="${ly}" stroke="${color}" stroke-width="${0.6/zoom}" ${dash} opacity="0.85" />`;

                    // Drag-and-drop label group
                    let r_sc = 8.5 / zoom;
                    let fontSz = (item.isGroove || item.isBevel) ? (8.5 / zoom) : (9.5 / zoom);
                    svg += `<g class="drag-hole-label" data-key="${key}" style="pointer-events:auto; cursor:grab;">`;
                    svg += `<circle cx="${lx}" cy="${ly}" r="${r_sc}" fill="#ffffff" stroke="${color}" stroke-width="${1.2/zoom}" style="pointer-events:auto;" />`;
                    svg += `<text x="${lx}" y="${ly}" font-family="Segoe UI, Arial" font-size="${fontSz}" text-anchor="middle" dominant-baseline="central" fill="${color}" font-weight="bold" style="pointer-events:auto; user-select:none;">${strNum}</text>`;
                    svg += `</g>`;
                  });
                }
                if (p.v_cuts && p.v_cuts.length > 0) {
                  p.v_cuts.forEach((vc, idx) => {
                    let vw = vc.w || 0, vh = vc.h || 0;
                    if (!vw || !vh) {
                      if (vc.sz && vc.sz.includes('x')) {
                        let parts_sz = vc.sz.split('x');
                        vw = parseFloat(parts_sz[0]) || 0;
                        vh = parseFloat(parts_sz[1]) || 0;
                      }
                    }

                    let extOver = 4 / zoom;
                    let arrSz = 5 / zoom;

                    // 1. Radius leaders pointing to EACH arc (R...) with arrows - Dynamic sliding angle
                    let arcsToRender = (vc.arcs && vc.arcs.length > 0) ? vc.arcs : [{ cx: vc.x + vw/2, cy: vc.y + vh - vc.r, r: vc.r }];
                    arcsToRender.forEach((arc, aIdx) => {
                      if (!arc.r || arc.r <= 0) return;
                      let key_r = p.id + '_dim_r_' + idx + '_' + aIdx;
                      if (hiddenItems[key_r]) return;
                      let off_r = holeOffsets[key_r] || { dx: 0, dy: 0 };

                      let scx = arc.cx * sc;
                      let scy = -arc.cy * sc;
                      let r_sc = arc.r * sc;

                      let arcPhi;
                      if (arc.mx !== undefined && arc.my !== undefined) {
                        arcPhi = Math.atan2(-arc.my * sc - scy, arc.mx * sc - scx);
                      } else {
                        let isLeft = (arc.cx - vc.x) <= (vc.w / 2 + 0.1);
                        let isTop = (arc.cy - vc.y) <= (vc.h / 2 + 0.1);
                        arcPhi = Math.atan2(isTop ? -1 : 1, isLeft ? -1 : 1);
                      }
                      
                      let defaultAngle = arcPhi + Math.PI;
                      let baseLx = scx + (r_sc + 18 / zoom) * Math.cos(defaultAngle);
                      let baseLy = scy + (r_sc + 18 / zoom) * Math.sin(defaultAngle);

                      let lx = baseLx + off_r.dx;
                      let ly = baseLy + off_r.dy;

                      let phi = Math.atan2(ly - scy, lx - scx);
                      
                      let angleDiff = Math.abs(phi - arcPhi);
                      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                      let useOpposite = (angleDiff > Math.PI / 2);
                      
                      let drawPhi = useOpposite ? (phi + Math.PI) : phi;
                      
                      let ax = scx + r_sc * Math.cos(drawPhi);
                      let ay = scy + r_sc * Math.sin(drawPhi);

                      let distToCenter = Math.hypot(lx - scx, ly - scy);
                      let isInside = distToCenter < r_sc;

                      let shelfDir = (Math.cos(phi) >= 0 ? 1 : -1);
                      let shelfX = lx + (18 / zoom) * shelfDir;

                      svg += `<g class="drag-dim-label" data-key="${key_r}" style="pointer-events:auto; cursor:grab;">`;
                      svg += `<line x1="${ax}" y1="${ay}" x2="${lx}" y2="${ly}" stroke="#000" stroke-width="${0.8/zoom}" style="pointer-events:auto;" />`;
                      
                      let arrAng;
                      if (useOpposite) {
                        arrAng = drawPhi + Math.PI;
                      } else {
                        arrAng = isInside ? (drawPhi + Math.PI) : drawPhi;
                      }
                      let p1x = ax + arrSz*1.5 * Math.cos(arrAng - 0.3);
                      let p1y = ay + arrSz*1.5 * Math.sin(arrAng - 0.3);
                      let p2x = ax + arrSz*1.5 * Math.cos(arrAng + 0.3);
                      let p2y = ay + arrSz*1.5 * Math.sin(arrAng + 0.3);
                      svg += `<polygon points="${ax},${ay} ${p1x},${p1y} ${p2x},${p2y}" fill="#000" style="pointer-events:auto;" />`;
                      svg += `<line x1="${lx}" y1="${ly}" x2="${shelfX}" y2="${ly}" stroke="#000" stroke-width="${0.8/zoom}" style="pointer-events:auto;" />`;
                      let txtX = (lx + shelfX) / 2;
                      let fontSz = 10 / zoom;
                      svg += `<text x="${txtX}" y="${ly - 4/zoom}" font-family="Segoe UI, Arial" font-size="${fontSz}" font-weight="bold" text-anchor="middle" dominant-baseline="auto" fill="#000" style="pointer-events:auto; user-select:none;">R${arc.r}</text>`;
                      svg += `</g>`;
                    });

                    let isLeftEdge = vc.x <= p.l / 2;
                    let isTopEdge = (vc.y + vh >= p.w - 5.0);

                    // 2. Vertical dimension line (Cutout height / depth) - Draggable
                    if (vh > 0) {
                      let key_h = p.id + '_dim_h_' + idx;
                      if (!hiddenItems[key_h]) {
                        let off_h = holeOffsets[key_h] || { dx: 0, dy: 0 };

                        let y_start = -vc.y * sc;
                        let y_end = (-vc.y - vh) * sc;
                        let refX = isLeftEdge ? (vc.x * sc) : ((vc.x + vw) * sc);
                        let dimX = refX + (isLeftEdge ? (-18 / zoom) : (18 / zoom)) + off_h.dx;
                        let extX = dimX + (isLeftEdge ? -extOver : extOver);

                        let minY = Math.min(y_start, y_end), maxY = Math.max(y_start, y_end);
                        let midY = (minY + maxY) / 2 + off_h.dy;
                        let fontSz = 10 / zoom;

                        svg += `<g class="drag-dim-label" data-key="${key_h}" style="pointer-events:auto; cursor:ew-resize;">`;
                        svg += `<line x1="${refX}" y1="${y_start}" x2="${extX}" y2="${y_start}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${refX}" y1="${y_end}" x2="${extX}" y2="${y_end}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${dimX}" y1="${minY}" x2="${dimX}" y2="${maxY}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${dimX-3/zoom}" y1="${minY+3/zoom}" x2="${dimX+3/zoom}" y2="${minY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${dimX-3/zoom}" y1="${maxY+3/zoom}" x2="${dimX+3/zoom}" y2="${maxY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        let txtX = isLeftEdge ? (dimX - 6/zoom) : (dimX + 6/zoom);
                        let txtAnchor = isLeftEdge ? "end" : "start";
                        svg += `<text x="${txtX}" y="${midY}" font-family="Segoe UI, Arial" font-size="${fontSz}" font-weight="bold" text-anchor="${txtAnchor}" dominant-baseline="central" fill="#333" style="user-select:none;">${Math.round(vh)}</text>`;
                        svg += `</g>`;
                      }
                    }

                    // 3. Horizontal dimension line (Cutout position) - Draggable
                    if (vc.x > 1.0) {
                      let key_pos = p.id + '_dim_pos_' + idx;
                      if (!hiddenItems[key_pos]) {
                        let off_pos = holeOffsets[key_pos] || { dx: 0, dy: 0 };

                        let x1 = 0, x2 = vc.x * sc;
                        let baseDimY = isTopEdge ? (-p.w * sc - 30 / zoom) : (30 / zoom);
                        let dimY = baseDimY + off_pos.dy;
                        let extY = dimY + (isTopEdge ? -extOver : extOver);
                        let midX = (x1 + x2) / 2 + off_pos.dx;
                        let fontSz = 10 / zoom;

                        svg += `<g class="drag-dim-label" data-key="${key_pos}" style="pointer-events:auto; cursor:ns-resize;">`;
                        svg += `<line x1="${x1}" y1="0" x2="${x1}" y2="${extY}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${x2}" y1="${-vc.y*sc}" x2="${x2}" y2="${extY}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${x1}" y1="${dimY}" x2="${x2}" y2="${dimY}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${x1-3/zoom}" y1="${dimY+3/zoom}" x2="${x1+3/zoom}" y2="${dimY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${x2-3/zoom}" y1="${dimY+3/zoom}" x2="${x2+3/zoom}" y2="${dimY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<text x="${midX}" y="${dimY - (isTopEdge ? -10/zoom : 6/zoom)}" font-family="Segoe UI, Arial" font-size="${fontSz}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="#333" style="user-select:none;">${Math.round(vc.x)}</text>`;
                        svg += `</g>`;
                      }
                    }

                    // 4. Horizontal dimension line (Cutout width) - Draggable
                    if (vw > 1.0) {
                      let key_w = p.id + '_dim_w_' + idx;
                      if (!hiddenItems[key_w]) {
                        let off_w = holeOffsets[key_w] || { dx: 0, dy: 0 };

                        let x1 = vc.x * sc, x2 = (vc.x + vw) * sc;
                        let baseDimY = isTopEdge ? (-p.w * sc - 30 / zoom) : (30 / zoom);
                        let dimY = baseDimY + off_w.dy;
                        let extY = dimY + (isTopEdge ? -extOver : extOver);
                        let midX = (x1 + x2) / 2 + off_w.dx;
                        let fontSz = 10 / zoom;

                        svg += `<g class="drag-dim-label" data-key="${key_w}" style="pointer-events:auto; cursor:ns-resize;">`;
                        svg += `<line x1="${x1}" y1="${-vc.y*sc}" x2="${x1}" y2="${extY}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${x2}" y1="${-vc.y*sc}" x2="${x2}" y2="${extY}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${x1}" y1="${dimY}" x2="${x2}" y2="${dimY}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${x1-3/zoom}" y1="${dimY+3/zoom}" x2="${x1+3/zoom}" y2="${dimY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${x2-3/zoom}" y1="${dimY+3/zoom}" x2="${x2+3/zoom}" y2="${dimY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<text x="${midX}" y="${dimY - (isTopEdge ? -10/zoom : 6/zoom)}" font-family="Segoe UI, Arial" font-size="${fontSz}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="#333" style="user-select:none;">${Math.round(vw)}</text>`;
                        svg += `</g>`;
                      }
                    }
                    // build444: 5. Вертикальний розмір ПОЗИЦІЇ вирізу (Y — відступ від НИЖНЬОГО краю
                    // деталі до низу вирізу). Раніше малювались висота/ширина/X-позиція, а Y-позиція — ні,
                    // тож на кресленні бракувало одного розміру (юзер: «не всі розміри вирізів»).
                    if (vc.y > 1.0) {
                      let key_ypos = p.id + '_dim_ypos_' + idx;
                      if (!hiddenItems[key_ypos]) {
                        let off_yp = holeOffsets[key_ypos] || { dx: 0, dy: 0 };
                        let y1 = 0;                 // нижній край деталі (модельна y=0 → SVG y=0)
                        let y2 = -vc.y * sc;        // низ вирізу
                        let refX = isLeftEdge ? ((vc.x + vw) * sc) : (vc.x * sc);
                        let dimX = refX + (isLeftEdge ? (18 / zoom) : (-18 / zoom)) + off_yp.dx;
                        let extX = dimX + (isLeftEdge ? extOver : -extOver);
                        let minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
                        let midY = (minY + maxY) / 2 + off_yp.dy;
                        let fontSz = 10 / zoom;
                        svg += `<g class="drag-dim-label" data-key="${key_ypos}" style="pointer-events:auto; cursor:ew-resize;">`;
                        svg += `<line x1="${refX}" y1="${y1}" x2="${extX}" y2="${y1}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${refX}" y1="${y2}" x2="${extX}" y2="${y2}" stroke="#333" stroke-width="${0.5/zoom}" opacity="0.6" />`;
                        svg += `<line x1="${dimX}" y1="${minY}" x2="${dimX}" y2="${maxY}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${dimX-3/zoom}" y1="${minY+3/zoom}" x2="${dimX+3/zoom}" y2="${minY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        svg += `<line x1="${dimX-3/zoom}" y1="${maxY+3/zoom}" x2="${dimX+3/zoom}" y2="${maxY-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        let txtX = isLeftEdge ? (dimX + 6/zoom) : (dimX - 6/zoom);
                        let txtAnchor = isLeftEdge ? "start" : "end";
                        svg += `<text x="${txtX}" y="${midY}" font-family="Segoe UI, Arial" font-size="${fontSz}" font-weight="bold" text-anchor="${txtAnchor}" dominant-baseline="central" fill="#333" style="user-select:none;">${Math.round(vc.y)}</text>`;
                        svg += `</g>`;
                      }
                    }
                  });
                }

                if (false) { // Deactivated here, moved below
                  
                  if (uniqueProfiles.length > 0) {
                    let initialX = 860 / zoom - transX;
                    let initialY = 570 / zoom - transY;
                    let fSz = 9.5 / zoom;
                    let dSc = 2.5; 
                    let partT = p.t || 18;
                    let secW = partT * dSc;
                    
                    const dimLine = (x1, y1, x2, y2, text, offset, isVert) => {
                      let str = '';
                      let lx1 = x1, ly1 = y1, lx2 = x2, ly2 = y2;
                      let tx = (x1 + x2) / 2, ty = (y1 + y2) / 2;
                      if (isVert) {
                        lx1 += offset; lx2 += offset; tx += offset;
                        str += `<line x1="${x1}" y1="${y1}" x2="${x1 + offset + Math.sign(offset)*3/zoom}" y2="${y1}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x2}" y1="${y2}" x2="${x2 + offset + Math.sign(offset)*3/zoom}" y2="${y2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${lx1}" y1="${y1}" x2="${lx2}" y2="${y2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<text x="${tx + (offset>0?3:-3)/zoom}" y="${ty}" font-family="Segoe UI, Arial" font-size="${fSz}" font-weight="bold" text-anchor="${offset>0?'start':'end'}" dominant-baseline="central" fill="#333" style="user-select:none;">${text}</text>`;
                        str += `<line x1="${lx1-3/zoom}" y1="${y1+3/zoom}" x2="${lx1+3/zoom}" y2="${y1-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${lx2-3/zoom}" y1="${y2+3/zoom}" x2="${lx2+3/zoom}" y2="${y2-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                      } else {
                        ly1 += offset; ly2 += offset; ty += offset;
                        str += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y1 + offset + Math.sign(offset)*3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x2}" y1="${y2}" x2="${x2}" y2="${y2 + offset + Math.sign(offset)*3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x1}" y1="${ly1}" x2="${x2}" y2="${ly2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<text x="${tx}" y="${ty + (offset>0?8:-4)/zoom}" font-family="Segoe UI, Arial" font-size="${fSz}" font-weight="bold" text-anchor="middle" fill="#333" style="user-select:none;">${text}</text>`;
                        str += `<line x1="${x1-3/zoom}" y1="${ly1+3/zoom}" x2="${x1+3/zoom}" y2="${ly1-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x2-3/zoom}" y1="${ly2+3/zoom}" x2="${x2+3/zoom}" y2="${ly2-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                      }
                      return str;
                    };

                    let blockX_offset = initialX;
                    
                    uniqueProfiles.forEach(prof => {
                      let key = p.id + '_gsec_' + prof.letter;
                      if (!hiddenItems[key]) {
                        let off = holeOffsets[key] || { dx: 0, dy: 0 };
                        let blockX = blockX_offset + off.dx;
                        let blockY = initialY + off.dy;

                        svg += `<g class="drag-dim-label" data-key="${key}" style="pointer-events:auto; cursor:grab;">`;
                        svg += `<text x="${blockX}" y="${blockY - 32/zoom}" font-family="Segoe UI, Arial" font-size="${11/zoom}" font-weight="bold" fill="#000" style="pointer-events:none; user-select:none;">Переріз ${prof.letter} (1:2)</text>`;
                        
                        let secH = 0;

                        if (prof.type === 'bevel') {
                          secH = 40 * dSc;
                          let isBack = prof.side && prof.side.includes("Тил");
                          let bOff = (prof.off !== undefined ? prof.off : 1.0) * dSc;
                          let cutWidth = (partT - (prof.off !== undefined ? prof.off : 1.0)) * dSc;
                          let a_rad = Math.abs(prof.a !== undefined ? prof.a : 45) * Math.PI / 180;
                          let bDepth = cutWidth * Math.tan(a_rad);
                          
                          let pts = [];
                          if (isBack) {
                            pts.push(`${blockX},${blockY}`); 
                            pts.push(`${blockX + bOff},${blockY}`); 
                            pts.push(`${blockX + secW},${blockY + bDepth}`); 
                            pts.push(`${blockX + secW},${blockY + secH}`); 
                            pts.push(`${blockX},${blockY + secH}`); 
                          } else {
                            pts.push(`${blockX + secW - bOff},${blockY}`); 
                            pts.push(`${blockX + secW},${blockY}`); 
                            pts.push(`${blockX + secW},${blockY + secH}`); 
                            pts.push(`${blockX},${blockY + secH}`); 
                            pts.push(`${blockX},${blockY + bDepth}`); 
                          }
                          svg += `<polygon points="${pts.join(' ')}" fill="url(#hatch_blue)" stroke="#000" stroke-width="${1/zoom}" style="pointer-events:auto;" />`;
                          
                          svg += dimLine(blockX, blockY + secH, blockX + secW, blockY + secH, partT, 14/zoom, false);
                          if (isBack) {
                            svg += dimLine(blockX, blockY, blockX + bOff, blockY, prof.off, -14/zoom, false);
                            let tx = blockX + bOff + cutWidth / 2 - 10/zoom;
                            let ty = blockY + bDepth / 2 + 10/zoom;
                            svg += `<text x="${tx}" y="${ty}" font-family="Segoe UI, Arial" font-size="${10/zoom}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="#333">${Math.abs(prof.a)}°</text>`;
                          } else {
                            svg += dimLine(blockX + secW - bOff, blockY, blockX + secW, blockY, prof.off, -14/zoom, false);
                            let tx = blockX + cutWidth / 2 + 10/zoom;
                            let ty = blockY + bDepth / 2 + 10/zoom;
                            svg += `<text x="${tx}" y="${ty}" font-family="Segoe UI, Arial" font-size="${10/zoom}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="#333">${Math.abs(prof.a)}°</text>`;
                          }
                        } else if (prof.type === 'groove') {
                          let gW = prof.w * dSc;
                          let gH = prof.h * dSc;
                          let gZ = prof.z * dSc;
                          
                          let isEdge = prof.side && prof.side.includes("ТОР");
                          let isBack = prof.side && prof.side.includes("ТИЛ");
                          
                          if (isEdge) {
                            let padLeft = (prof.z < 1.0) ? 0 : prof.z * dSc;
                            let padRight = (prof.z + prof.w > partT - 1.0) ? 0 : (partT - prof.z - prof.w) * dSc;
                            secH = gH + 20 * dSc;
                            
                            let pts = [];
                            pts.push(`${blockX},${blockY + secH}`);
                            pts.push(`${blockX + secW},${blockY + secH}`);
                            if (padRight > 0) { pts.push(`${blockX + secW},${blockY}`); pts.push(`${blockX + padLeft + gW},${blockY}`); }
                            pts.push(`${blockX + padLeft + gW},${blockY + gH}`);
                            pts.push(`${blockX + padLeft},${blockY + gH}`);
                            if (padLeft > 0) { pts.push(`${blockX + padLeft},${blockY}`); pts.push(`${blockX},${blockY}`); }
                            
                            svg += `<polygon points="${pts.join(' ')}" fill="url(#hatch_blue)" stroke="#000" stroke-width="${1/zoom}" style="pointer-events:auto;" />`;
                            
                            let cutX = blockX + gZ;
                            
                            svg += dimLine(cutX, blockY, cutX + gW, blockY, prof.w, -14/zoom, false);
                            svg += dimLine(blockX + secW, blockY, blockX + secW, blockY + gH, prof.h, 14/zoom, true);
                            svg += dimLine(blockX, blockY + secH, blockX + secW, blockY + secH, partT, 14/zoom, false);
                          } else {
                            let dTop = Math.max(0, p.w - prof.y - prof.w);
                            let padTop = (dTop < 20.0) ? dTop * dSc : 20 * dSc;
                            let padBottom = (prof.y < 20.0) ? prof.y * dSc : 20 * dSc;
                            secH = gW + padTop + padBottom;
                            let gy = blockY + padTop;
                            
                            let pts = [];
                            if (isBack) {
                              pts.push(`${blockX},${blockY}`);
                              if (padTop > 0) { pts.push(`${blockX + secW},${blockY}`); pts.push(`${blockX + secW},${gy}`); }
                              pts.push(`${blockX + secW - gH},${gy}`);
                              pts.push(`${blockX + secW - gH},${gy + gW}`);
                              if (padBottom > 0) { pts.push(`${blockX + secW},${gy + gW}`); pts.push(`${blockX + secW},${blockY + secH}`); }
                              pts.push(`${blockX},${blockY + secH}`);
                            } else {
                              pts.push(`${blockX + secW},${blockY}`);
                              pts.push(`${blockX + secW},${blockY + secH}`);
                              if (padBottom > 0) { pts.push(`${blockX},${blockY + secH}`); pts.push(`${blockX},${gy + gW}`); }
                              pts.push(`${blockX + gH},${gy + gW}`);
                              pts.push(`${blockX + gH},${gy}`);
                              if (padTop > 0) { pts.push(`${blockX},${gy}`); pts.push(`${blockX},${blockY}`); }
                            }
                            
                            svg += `<polygon points="${pts.join(' ')}" fill="url(#hatch_blue)" stroke="#000" stroke-width="${1/zoom}" style="pointer-events:auto;" />`;
                            
                            let cutX = isBack ? blockX + secW - gH : blockX;
                            
                            if (prof.h > 0) {
                              let offY = blockY - gy - 14/zoom;
                              svg += dimLine(blockX + (isBack?secW-gH:0), gy, blockX + (isBack?secW:gH), gy, prof.h, offY, false);
                            }
                            svg += dimLine(blockX + (isBack?secW:0), gy, blockX + (isBack?secW:0), gy + gW, prof.w, (isBack?14:-14)/zoom, true);
                            
                            if (dTop > 0 && dTop < 20.0) {
                              let dTopVal = dTop % 1 === 0 ? dTop : dTop.toFixed(1);
                              svg += dimLine(blockX + (isBack?secW:0), blockY, blockX + (isBack?secW:0), gy, dTopVal, (isBack?14:-14)/zoom, true);
                            }
                            if (prof.y > 0 && prof.y < 20.0) {
                              let yVal = prof.y % 1 === 0 ? prof.y : prof.y.toFixed(1);
                              svg += dimLine(blockX + (isBack?secW:0), gy + gW, blockX + (isBack?secW:0), blockY + secH, yVal, (isBack?14:-14)/zoom, true);
                            }
                            
                            svg += dimLine(blockX, blockY + secH, blockX + secW, blockY + secH, partT, 14/zoom, false);
                          }
                        }
                        
                        svg += `</g>`;
                        blockX_offset += secW + 70/zoom;
                      } else {
                        blockX_offset += 110/zoom;
                      }
                    });
                  }
                }

                // build205: бокові проекції деталі (торці/кромки) + габаритні розміри — як у діалозі
                svg += getSideViewSVG(p, sc, zoom);

                svg += `</g></g>`;

                if (window.drawGrooveSections) {
                  if (uniqueProfiles.length > 0) {
                    const zoom = 1.0;
                    let initialX = 860;
                    let initialY = 570;
                    let fSz = 9.5 / zoom;
                    let dSc = 2.5;
                    let partT = p.t || 18;
                    let secW = partT * dSc;

                    const dimLine = (x1, y1, x2, y2, text, offset, isVert) => {
                      let str = '';
                      let lx1 = x1, ly1 = y1, lx2 = x2, ly2 = y2;
                      let tx = (x1 + x2) / 2, ty = (y1 + y2) / 2;
                      if (isVert) {
                        lx1 += offset; lx2 += offset; tx += offset;
                        str += `<line x1="${x1}" y1="${y1}" x2="${x1 + offset + Math.sign(offset)*3/zoom}" y2="${y1}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x2}" y1="${y2}" x2="${x2 + offset + Math.sign(offset)*3/zoom}" y2="${y2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${lx1}" y1="${y1}" x2="${lx2}" y2="${y2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<text x="${tx + (offset>0?3:-3)/zoom}" y="${ty}" font-family="Segoe UI, Arial" font-size="${fSz}" font-weight="bold" text-anchor="${offset>0?'start':'end'}" dominant-baseline="central" fill="#333" style="user-select:none;">${text}</text>`;
                        str += `<line x1="${lx1-3/zoom}" y1="${y1+3/zoom}" x2="${lx1+3/zoom}" y2="${y1-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${lx2-3/zoom}" y1="${y2+3/zoom}" x2="${lx2+3/zoom}" y2="${y2-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                      } else {
                        ly1 += offset; ly2 += offset; ty += offset;
                        str += `<line x1="${x1}" y1="${y1}" x2="${x1}" y2="${y1 + offset + Math.sign(offset)*3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x2}" y1="${y2}" x2="${x2}" y2="${y2 + offset + Math.sign(offset)*3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x1}" y1="${ly1}" x2="${x2}" y2="${ly2}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<text x="${tx}" y="${ty + (offset>0?8:-4)/zoom}" font-family="Segoe UI, Arial" font-size="${fSz}" font-weight="bold" text-anchor="middle" fill="#333" style="user-select:none;">${text}</text>`;
                        str += `<line x1="${x1-3/zoom}" y1="${ly1+3/zoom}" x2="${x1+3/zoom}" y2="${ly1-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                        str += `<line x1="${x2-3/zoom}" y1="${ly2+3/zoom}" x2="${x2+3/zoom}" y2="${ly2-3/zoom}" stroke="#333" stroke-width="${0.5/zoom}" />`;
                      }
                      return str;
                    };

                    // build209: лінія обриву — хвиляста риска ближче до низу перерізу,
                    // показує, що деталь фізично продовжується далі за межі фрагмента.
                    const breakLine = (bx, by, bw) => {
                      let segs = 3;
                      let segW = bw / segs;
                      let amp = 3.5 / zoom;
                      let d = `M ${bx} ${by}`;
                      for (let i = 0; i < segs; i++) {
                        let xm = bx + (i + 0.5) * segW, xe = bx + (i + 1) * segW;
                        let dir = (i % 2 === 0) ? -1 : 1;
                        d += ` Q ${xm} ${by + dir * amp}, ${xe} ${by}`;
                      }
                      return `<path d="${d}" fill="none" stroke="#333" stroke-width="${0.9/zoom}" />`;
                    };

                    let blockX_offset = initialX;

                    uniqueProfiles.forEach(prof => {
                      let key = p.id + '_gsec_' + prof.letter;
                      if (!hiddenItems[key]) {
                        let off = holeOffsets[key] || { dx: 0, dy: 0 };
                        let blockX = blockX_offset + off.dx;
                        let blockY = initialY + off.dy;

                        svg += `<g class="drag-dim-label" data-key="${key}" style="pointer-events:auto; cursor:grab;">`;
                        svg += `<text x="${blockX}" y="${blockY - 32/zoom}" font-family="Segoe UI, Arial" font-size="${11/zoom}" font-weight="bold" fill="#000" style="pointer-events:none; user-select:none;">Переріз ${prof.letter} (1:2)</text>`;

                        let secH = 0;

                        if (prof.type === 'bevel') {
                          secH = 40 * dSc;
                          let isBack = prof.side && prof.side.includes("Тил");
                          let bOff = (prof.off !== undefined ? prof.off : 1.0) * dSc;
                          let cutWidth = (partT - (prof.off !== undefined ? prof.off : 1.0)) * dSc;
                          let a_rad = Math.abs(prof.a !== undefined ? prof.a : 45) * Math.PI / 180;
                          let bDepth = cutWidth * Math.tan(a_rad);
                          
                          let pts = [];
                          if (isBack) {
                            pts.push(`${blockX},${blockY}`); 
                            pts.push(`${blockX + bOff},${blockY}`); 
                            pts.push(`${blockX + secW},${blockY + bDepth}`); 
                            pts.push(`${blockX + secW},${blockY + secH}`); 
                            pts.push(`${blockX},${blockY + secH}`); 
                          } else {
                            pts.push(`${blockX + secW - bOff},${blockY}`); 
                            pts.push(`${blockX + secW},${blockY}`); 
                            pts.push(`${blockX + secW},${blockY + secH}`); 
                            pts.push(`${blockX},${blockY + secH}`); 
                            pts.push(`${blockX},${blockY + bDepth}`); 
                          }
                          
                          svg += `<polygon points="${pts.join(' ')}" fill="url(#hatch_blue_static)" stroke="#333" stroke-width="${0.8/zoom}" />`;
                          svg += breakLine(blockX + 4/zoom, blockY + secH - 10/zoom, secW - 8/zoom);

                          if (isBack) {
                            svg += `<line x1="${blockX}" y1="${blockY}" x2="${blockX}" y2="${blockY + secH}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                            // Reconstruct cut-off corner with dashed helper lines
                            svg += `<line x1="${blockX + bOff}" y1="${blockY}" x2="${blockX + secW}" y2="${blockY}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                            svg += `<line x1="${blockX + secW}" y1="${blockY}" x2="${blockX + secW}" y2="${blockY + bDepth}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                          } else {
                            svg += `<line x1="${blockX + secW}" y1="${blockY}" x2="${blockX + secW}" y2="${blockY + secH}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                            // Reconstruct cut-off corner with dashed helper lines
                            svg += `<line x1="${blockX}" y1="${blockY}" x2="${blockX + secW - bOff}" y2="${blockY}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                            svg += `<line x1="${blockX}" y1="${blockY}" x2="${blockX}" y2="${blockY + bDepth}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                          }
                          
                          let arcRadius = 15 / zoom;
                          let arcX = isBack ? blockX + bOff : blockX + secW - bOff;
                          let arcY = blockY;
                          
                          let startAngle = isBack ? 0 : Math.PI;
                          let endAngle = isBack ? a_rad : Math.PI - a_rad;
                          let sweep = isBack ? 1 : 0;
                          
                          let x1 = arcX + arcRadius * Math.cos(startAngle);
                          let y1 = arcY + arcRadius * Math.sin(startAngle);
                          let x2 = arcX + arcRadius * Math.cos(endAngle);
                          let y2 = arcY + arcRadius * Math.sin(endAngle);
                          
                          svg += `<path d="M ${x1} ${y1} A ${arcRadius} ${arcRadius} 0 0 ${sweep} ${x2} ${y2}" fill="none" stroke="#333" stroke-width="${0.5/zoom}" />`;
                          
                          let textRadius = 24 / zoom;
                          let midAngle = isBack ? (a_rad / 2) : (Math.PI - a_rad / 2);
                          let tx = arcX + textRadius * Math.cos(midAngle);
                          let ty = arcY + textRadius * Math.sin(midAngle) - 2/zoom;
                          svg += `<text x="${tx}" y="${ty}" font-family="Segoe UI, Arial" font-size="${8.5/zoom}" fill="#333" text-anchor="middle" dominant-baseline="central" style="user-select:none;">${Math.abs(prof.a)}°</text>`;
                          
                          // Розмір «Відступ» ставимо на ПЛОСКІЙ полочці (де немає зрізу):
                          // для лицьового зрізу (isBack=false) фаска знімає верхній-ЛІВИЙ кут,
                          // тож полочка — праворуч (secW-bOff … secW); для тильного (isBack=true)
                          // фаска праворуч, полочка ліворуч (0 … bOff).
                          if (isBack) {
                            svg += dimLine(blockX, blockY, blockX + bOff, blockY, prof.off, -14/zoom, false);
                          } else {
                            svg += dimLine(blockX + secW - bOff, blockY, blockX + secW, blockY, prof.off, -14/zoom, false);
                          }
                          svg += dimLine(blockX, blockY + secH, blockX + secW, blockY + secH, partT, 14/zoom, false);
                        } else if (prof.side && prof.side.toUpperCase().includes("ТОР")) {
                          // build206: ТОРЦЕВИЙ паз — вертикальна прорізь з торця (зверху перерізу):
                          // ширина W по товщині на відступі Z від лицьової грані, глибина H вниз.
                          secH = 50 * dSc;
                          svg += `<rect x="${blockX}" y="${blockY}" width="${secW}" height="${secH}" fill="url(#hatch_blue_static)" stroke="#333" stroke-width="${0.8/zoom}" />`;
                          svg += breakLine(blockX + 4/zoom, blockY + secH - 10/zoom, secW - 8/zoom);

                          let gW = prof.w * dSc;
                          let gH = prof.h * dSc;
                          let gZ = prof.z * dSc;
                          let gx = blockX + gZ;

                          svg += `<rect x="${gx}" y="${blockY}" width="${gW}" height="${gH}" fill="#fff" stroke="#333" stroke-width="${0.8/zoom}" />`;
                          svg += `<line x1="${gx}" y1="${blockY}" x2="${gx + gW}" y2="${blockY}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;

                          // build209: Z і W ланцюжком в ОДНІЙ смузі над перерізом (Z: blockX→gx,
                          // W: gx→gx+gW) — раніше Z рисувався ПІД вирізом на blockY+gH+15, що
                          // потрапляло всередину заштрихованого матеріалу (fragmen до 50мм).
                          // H — за межею секції праворуч.
                          if (prof.z > 0) {
                            let zVal = prof.z % 1 === 0 ? prof.z : prof.z.toFixed(1);
                            svg += dimLine(blockX, blockY, gx, blockY, zVal, -14/zoom, false);
                          }
                          if (prof.w > 0) svg += dimLine(gx, blockY, gx + gW, blockY, prof.w, -14/zoom, false);
                          if (prof.h > 0) svg += dimLine(blockX + secW, blockY, blockX + secW, blockY + gH, prof.h, 14/zoom, true);
                          svg += dimLine(blockX, blockY + secH, blockX + secW, blockY + secH, partT, 14/zoom, false);
                        } else {
                          secH = 50 * dSc;
                          svg += `<rect x="${blockX}" y="${blockY}" width="${secW}" height="${secH}" fill="url(#hatch_blue_static)" stroke="#333" stroke-width="${0.8/zoom}" />`;
                          svg += breakLine(blockX + 4/zoom, blockY + secH - 10/zoom, secW - 8/zoom);

                          let gW = prof.w * dSc;
                          let gH = prof.h * dSc;
                          let isBack = prof.side && prof.side.includes("Тил");
                          let boardW = p.w || 0;
                          let distNear = prof.y;
                          let distFar = boardW - (prof.y + prof.w);
                          // Ближній фізичний край (менша з двох відстаней) — від нього й підпис.
                          let dN = (distNear >= 0) ? distNear : Infinity;
                          let dF = (distFar >= 0) ? distFar : Infinity;
                          let edgeDist = Math.min(dN, dF);
                          if (!isFinite(edgeDist)) edgeDist = 0;
                          let atEdge = edgeDist < 0.5;
                          // build211: паз/чверть біля БУДЬ-ЯКОГО фізичного краю (ближнього чи
                          // дальнього) малюємо в ОДНАКОВІЙ позиції — впритул до верху фрагмента.
                          // Раніше дальній край малювався внизу, тоді як H (завжди зверху) лишався
                          // прив'язаним до нього довгою відірваною лінією-виноскою через увесь
                          // переріз — розмір опинявся далеко від паза. Фізичний зміст (який саме
                          // край) передає значення підпису (distNear/distFar), а не позиція.
                          // Відступ підписуємо ЗАВЖДИ (раніше — лише коли паз <20мм від краю, і для
                          // пазів глибше 20мм розмір зникав зовсім). Якщо у масштабі не влазить у
                          // фрагмент — притискаємо паз ближче до краю + лінія обриву; підпис = істинна.
                          let maxFitPx = secH - gW - 12 * dSc;
                          let toScalePx = edgeDist * dSc;
                          let broken = toScalePx > maxFitPx;
                          let gy = blockY + (broken ? maxFitPx : toScalePx);
                          if (broken) svg += breakLine(blockX + 4/zoom, blockY + (gy - blockY) / 2, secW - 8/zoom);

                          if (isBack) {
                            svg += `<rect x="${blockX + secW - gH}" y="${gy}" width="${gH}" height="${gW}" fill="#fff" stroke="#333" stroke-width="${0.8/zoom}" />`;
                            svg += `<line x1="${blockX + secW}" y1="${gy}" x2="${blockX + secW}" y2="${gy + gW}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                          } else {
                            svg += `<rect x="${blockX}" y="${gy}" width="${gH}" height="${gW}" fill="#fff" stroke="#333" stroke-width="${0.8/zoom}" />`;
                            svg += `<line x1="${blockX}" y1="${gy}" x2="${blockX}" y2="${gy + gW}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                          }
                          // build208/211: якщо паз/чверть впирається у ФІЗИЧНИЙ край деталі — та
                          // сторона прорізі теж «відкрита» (пунктир), а не суцільна межа, як у
                          // закритого паза. Обидва випадки (ближній/дальній) тепер зверху.
                          if (atEdge) {
                            svg += `<line x1="${blockX + (isBack?secW-gH:0)}" y1="${gy}" x2="${blockX + (isBack?secW:gH)}" y2="${gy}" stroke="#333" stroke-dasharray="2,2" stroke-width="${0.5/zoom}" />`;
                          }

                          if (prof.h > 0) {
                            let offY = blockY - gy - 14/zoom;
                            svg += dimLine(blockX + (isBack?secW-gH:0), gy, blockX + (isBack?secW:gH), gy, prof.h, offY, false);
                          }
                          svg += dimLine(blockX + (isBack?secW:0), gy, blockX + (isBack?secW:0), gy + gW, prof.w, (isBack?14:-14)/zoom, true);

                          // build206/211: відступ від фізичного краю підписуємо ОДИН раз — від
                          // верху фрагмента до паза (значення — distNear чи distFar залежно від
                          // того, який край справді ближче). Якщо впритул (≈0) — не малюємо,
                          // щоб не давати вироджений нульовий розмір.
                          if (edgeDist > 0.5) {
                            let dVal = edgeDist % 1 === 0 ? edgeDist : edgeDist.toFixed(1);
                            svg += dimLine(blockX + (isBack?secW:0), blockY, blockX + (isBack?secW:0), gy, dVal, (isBack?14:-14)/zoom, true);
                          }

                          svg += dimLine(blockX, blockY + secH, blockX + secW, blockY + secH, partT, 14/zoom, false);
                        }
                        
                        svg += `</g>`;
                        blockX_offset += secW + 70/zoom; 
                      } else {
                        blockX_offset += 110/zoom; 
                      }
                    });
                  }
                }

                svg += `</g></g>`;
                
                // Static Coordinate Axes Indicator in Bottom-Left Corner of Sheet (15mm offset)
                svg += `<g class="coord-axes" style="pointer-events:none;">`;
                svg += `<circle cx="60" cy="735" r="2.5" fill="#444" />`;
                svg += `<text x="54" y="747" font-family="Segoe UI, Arial" font-size="9.5" fill="#444" text-anchor="end">0,0</text>`;
                svg += `<line x1="60" y1="735" x2="88" y2="735" stroke="#444" stroke-width="1.2" />`;
                svg += `<polygon points="88,732 93,735 88,738" fill="#444" />`;
                svg += `<text x="97" y="739" font-family="Segoe UI, Arial" font-size="11" font-weight="bold" fill="#333" text-anchor="start">X</text>`;
                svg += `<line x1="60" y1="735" x2="60" y2="707" stroke="#444" stroke-width="1.2" />`;
                svg += `<polygon points="57,707 60,702 63,707" fill="#444" />`;
                svg += `<text x="60" y="696" font-family="Segoe UI, Arial" font-size="11" font-weight="bold" fill="#333" text-anchor="middle">Y</text>`;
                svg += `</g></svg>`;
                return svg;
              }
