/********************************************************
=========================================================
============LIST MANUAL PATHS AND ALL PATHS==============
=========================================================
********************************************************/

var paths = null;
var alpath = new go.List();

// --- manual selection scope (start/end) ---
var manualMode = false;
var manualStartKey = null;
var manualEndKey = null;

// ====== NEW GLOBALS for filtered rendering ======
var allPathsData = []; // [{ path: go.List<Node>, label: string, endKey: string }]
var displayedPaths = []; // current subset shown

// Build the checkbox list of all middle-layer component nodes
function buildEndNodeCheckboxes() {
	var $box = document.getElementById("endNodeFilters");
	if (!$box) return;

	// Collect all middle-layer nodes from diagram
	var compNodes = [];
	if (
		typeof mymiddleHarm !== "undefined" &&
		mymiddleHarm &&
		mymiddleHarm.nodes
	) {
		mymiddleHarm.nodes.each(function (node) {
			if (node.data.key == "A") return; // skip attacker
			var key =
				node.data && node.data.key !== undefined ? node.data.key : null;
			var label =
				node.data && (node.data.text || node.data.name)
					? node.data.text || node.data.name
					: key;
			if (key !== null) compNodes.push({ key: key, label: label });
		});
	}

	// Sort by label for ordered list
	compNodes.sort(function (a, b) {
		var A = String(a.label).toLowerCase(),
			B = String(b.label).toLowerCase();
		return A < B ? -1 : A > B ? 1 : 0;
	});

	// Render checkboxes
	$box.innerHTML = "";
	compNodes.forEach(function (c) {
		var id = "flt_" + String(c.key).replace(/\s+/g, "_");
		var wrap = document.createElement("div");
		wrap.className = "form-check";

		var cb = document.createElement("input");
		cb.type = "checkbox";
		cb.className = "form-check-input";
		cb.id = id;
		cb.value = c.key;

		var lab = document.createElement("label");
		lab.className = "form-check-label";
		lab.htmlFor = id;
		lab.textContent = String(c.label);

		wrap.appendChild(cb);
		wrap.appendChild(lab);
		$box.appendChild(wrap);

		// React to clicks: re-render the path list filtered by selected end nodes
		cb.addEventListener("change", applyEndNodeFilter);
	});

	// Clear button
	var clr = document.getElementById("clearEndNodeFilter");
	if (clr) {
		clr.onclick = function () {
			Array.from($box.querySelectorAll("input[type=checkbox]")).forEach(
				function (c) {
					c.checked = false;
				}
			);
			applyEndNodeFilter();
		};
	}
}

function applyEndNodeFilter() {
	refreshDisplayed();
}

// Rebuild the #allPaths from allPathsData, optionally filtering
function renderAllPathsSelect(filterEndKeys) {
	var sel = document.getElementById("allPaths");
	if (!sel) return;
	sel.innerHTML = "";

	var showAll = !filterEndKeys || filterEndKeys.length === 0;

	displayedPaths = showAll
		? allPathsData.slice()
		: allPathsData.filter(function (it) {
				// Paths that pass through the selected node
				for (var i = 0; i < it.path.length; i++) {
					var n = it.path.get(i);
					if (
						n &&
						n.data &&
						filterEndKeys.indexOf(String(n.data.key)) >= 0
					)
						return true;
				}
				return false;
		  });

	displayedPaths.forEach(function (it, idx) {
		var opt = document.createElement("option");
		opt.text = it.label;
		opt.value = idx;
		sel.add(opt, null);
	});

	sel.onchange = highlightThisFilteredPath;
	var num = document.getElementById("numofallPath");
	if (num) num.innerHTML = "Number of paths: " + displayedPaths.length;
}

// Highlight handler for the filtered list — reuses your highlightPath(path) if present
function highlightThisFilteredPath() {
	var sel = document.getElementById("allPaths");
	var idx = sel ? sel.selectedIndex : -1;
	if (idx < 0) return;
	var item = displayedPaths[idx];
	if (!item) return;
	if (typeof highlightPath === "function") {
		highlightPath(item.path);
	}
}

function getNodeProbabilityByKey(key) {
	try {
		var lowerNode =
			mylowerHarm && mylowerHarm.findNodeForKey
				? mylowerHarm.findNodeForKey(key)
				: null;
		if (lowerNode && typeof getProbOfNode === "function") {
			var p = getProbOfNode(lowerNode);
			return typeof p === "number" && !isNaN(p) ? p : 0;
		}
	} catch (e) {}
	return 0;
}

function getNodeImpactByKey(key) {
	// Try cached mapping first (built in nodeInfo), else compute max child vulnerability impact
	maxImpMap = getMaxVulnImpactOfMiddleNodes();
	return maxImpMap[key] || 0;
}

// Update the Path Information display to show info for the filtered displayedPaths
function updatePathInformation(filterEndKeys) {
	var table = document.getElementById("pathinfotable");
	if (!table) return;

	// clear old rows but keep header
	var oldBody = table.getElementsByTagName("tbody")[0];
	if (oldBody) table.removeChild(oldBody);
	var tbody = document.createElement("tbody");

	if (!displayedPaths || displayedPaths.length === 0) {
		var row = tbody.insertRow();
		var cell = row.insertCell(0);
		cell.colSpan = 6;
		cell.textContent = "No paths match the selected component node(s).";
	} else {
		const fmt = (v) =>
			v ?? v === 0
				? typeof round4 === "function"
					? round4(v)
					: Number(v).toFixed(4)
				: "-";

		displayedPaths.forEach(function (it) {
			const row = tbody.insertRow();
			const impact = getImpactofPath(it.path);
			const probability = getProbOfPath(it.path);
			risk = impact * probability;
			row.insertCell(0).textContent = it.label; // Path string
			// row.insertCell(1).textContent = it.path.length; // Node count (or hops = length-1)
			row.insertCell(1).textContent = fmt(impact);
			row.insertCell(2).textContent = fmt(probability);
			row.insertCell(3).textContent = fmt(risk);
			// row.insertCell(5).textContent = fmt(riskMul);
		});
	}
	table.appendChild(tbody);
}

function getCheckedEndFilters() {
	return Array.from(
		document.querySelectorAll(
			"#endNodeFilters input[type=checkbox]:checked"
		)
	).map((c) => String(c.value));
}

// Recompute displayedPaths based on current mode:
// - manual start/end selected  -> compute fresh from collectPaths(begin,end)
// - no manual selection        -> use allPathsData (your precomputed universe)
function refreshDisplayed() {
	var filters = getCheckedEndFilters();
	if (manualMode && manualStartKey && manualEndKey) {
		rebuildDisplayedFromManual(manualStartKey, manualEndKey, filters);
	} else {
		renderAllPathsSelect(filters);
		updatePathInformation(filters);
	}
}

/**
Input: Event - Click the Reset button
Output: Clear the selection Node
**/
function resetNodes() {
	console.log("Reset Source and Destination Node Done");
	mymiddleHarm.clearSelection();
	manualMode = false;
	manualStartKey = null;
	manualEndKey = null;
	refreshDisplayed(); // go back to global-all paths view, still honoring checkboxes
}

/**
Input: Event - Select the source node and destination node
Output: (1) Hightlight the shorstest path
       (2) List all path from the source and the dest node
**/
function nodeSelectionChanged(node) {
	var diagram = node.diagram;
	if (diagram === null) return;
	diagram.clearHighlighteds();

	if (node.isSelected) {
		if (!manualStartKey) {
			manualStartKey = node.key;
			manualMode = true;
		} else if (!manualEndKey && node.key !== manualStartKey) {
			manualEndKey = node.key;
			refreshDisplayed();
		}
	}
}

function rebuildDisplayedFromManual(startKey, endKey, filterEndKeys) {
	// safety
	if (!startKey || !endKey) return;

	// find GoJS node objects
	var begin = null,
		end = null;
	mymiddleHarm.nodes.each(function (n) {
		if (n.data && n.data.key === startKey) begin = n;
		if (n.data && n.data.key === endKey) end = n;
	});
	if (!begin || !end) return;

	// compute paths just for this pair
	var pairPaths = collectPaths(begin, end);

	// Rebuild the <select id="allPaths"> and displayedPaths from scratch
	var sel = document.getElementById("allPaths");
	if (sel) sel.innerHTML = "";
	displayedPaths = [];

	pairPaths.each(function (p) {
		// compute metrics (same approach as in collectEveryPaths)
		var optText = pathToString(p);

		var pathImpactMax = 0;
		var pathProbProduct = 1;
		var riskSum = 0;

		for (var i = 0; i < p.length; i++) {
			var n = p.get(i);
			if (!n || !n.data) continue;
			var t = n.data.type;
			if (t !== "component" && t !== "AccessNode") continue;

			var key = n.data.key;
			var nImp = getNodeImpactByKey(key) || 0;
			var nProb = getNodeProbabilityByKey(key) || 0;

			if (nImp > pathImpactMax) pathImpactMax = nImp;
			pathProbProduct *= nProb > 0 ? nProb : 1;
			riskSum += nProb * nImp;
		}
		var riskMul = pathImpactMax * pathProbProduct;

		// record
		var lastNode = p.get(p.length - 1);
		var endKey = lastNode && lastNode.data ? lastNode.data.key : "";

		var item = {
			path: p,
			label: optText,
			endKey: endKey,
			meta: {
				impact: round2(pathImpactMax),
				probability: round4(pathProbProduct),
				riskSum: round4(riskSum),
				riskMul: round4(riskMul)
			}
		};

		displayedPaths.push(item);
	});

	// Apply checkbox filters (pass-through semantics)
	var showAll = !filterEndKeys || filterEndKeys.length === 0;
	var filtered = showAll
		? displayedPaths.slice()
		: displayedPaths.filter(function (it) {
				for (var i = 0; i < it.path.length; i++) {
					var n = it.path.get(i);
					if (
						n &&
						n.data &&
						filterEndKeys.indexOf(String(n.data.key)) >= 0
					)
						return true;
				}
				return false;
		  });

	// Rebuild <select> from filtered
	if (sel) {
		filtered.forEach(function (it, idx) {
			var opt = document.createElement("option");
			opt.text = it.label;
			opt.value = idx; // local index in filtered list (we’ll keep ‘displayedPaths’ pointing to filtered)
			sel.add(opt, null);
		});
		sel.onchange = highlightThisFilteredPath;
	}

	// swap displayedPaths to the filtered set and update counts/table
	displayedPaths = filtered;

	var num = document.getElementById("numofallPath");
	if (num) num.innerHTML = "Number of path: " + displayedPaths.length;

	updatePathInformation(filterEndKeys);
}

/**
Input: Source  Nodes
Output: Count the distance and set data to the middle IVHARM
**/
function showDistances(begin) {
	distances = findDistances(begin);
	var it = distances.iterator;
	while (it.next()) {
		var n = it.key;
		var dist = it.value;
		mymiddleHarm.model.setDataProperty(n.data, "distance", dist);
	}
}

/**
 Input: Source Node
 Output: findDistances(Node) computes the distance of each Node from the given Node.
             This function is used by showDistances to update the model data.
 Returns a Map of Nodes with distance values from the given source Node.
Assumes all links are directional
**/
function findDistances(source) {
	var diagram = source.diagram;
	var distances = new go.Map(/*go.Node, "number"*/);
	var nit = diagram.nodes;
	while (nit.next()) {
		var n = nit.value;
		distances.set(n, Infinity);
	}

	distances.set(source, 0);
	var seen = new go.Set(/*go.Node*/);
	seen.add(source);
	var finished = new go.Set(/*go.Node*/);
	while (seen.count > 0) {
		var least = leastNode(seen, distances);
		var leastdist = distances.get(least);
		seen.delete(least);
		finished.add(least);
		var it = least.findLinksOutOf();
		while (it.next()) {
			var link = it.value;
			var neighbor = link.getOtherNode(least);
			if (finished.has(neighbor)) continue;
			var neighbordist = distances.get(neighbor);
			var dist = leastdist + 1;
			if (dist < neighbordist) {
				if (neighbordist === Infinity) {
					seen.add(neighbor);
				}
				distances.set(neighbor, dist);
			}
		}
	}

	return distances;
}

/**
Input: Source and Destination Nodes
Output: Highlight the shortest path with red color
**/
function highlightShortestPath(begin, end) {
	highlightPath(findShortestPath(begin, end));
}

/**
Input: Path that need to be highlighted
Output: (1) Clear the old highlight path
        (2) Highlight the new path
**/
function highlightPath(path) {
	mymiddleHarm.clearHighlighteds();
	for (var i = 0; i < path.count - 1; i++) {
		var f = path.get(i);
		var t = path.get(i + 1);
		f.findLinksTo(t).each((l) => (l.isHighlighted = true));
	}
}

/**
 Input: Source Node and destination Node
 Output: findShortestPath(Node, Node) finds a shortest path from one Node to another.
    This uses findDistances.  This is used by highlightShortestPath.
    Assumes all links are directional
**/
function findShortestPath(begin, end) {
	distances = findDistances(begin);
	var path = new go.List();
	path.add(end);
	while (end !== null) {
		var next = leastNode(end.findNodesInto(), distances);
		if (next !== null) {
			if (distances.get(next) < distances.get(end)) {
				path.add(next); // making progress towards the beginning
			} else {
				next = null; // nothing better found -- stop looking
			}
		}
		end = next;
	}

	path.reverse();
	return path;
}

/**
This helper function finds a Node in the given collection that has the smallest distance.
**/
function leastNode(coll, distances) {
	var bestdist = Infinity;
	var bestnode = null;
	var it = coll.iterator;
	while (it.next()) {
		var n = it.value;
		var dist = distances.get(n);
		if (dist < bestdist) {
			bestdist = dist;
			bestnode = n;
		}
	}
	return bestnode;
}

function calculateKzero(path) {
	var distance = path.length;
	for (var i = 0; i < path.length; i++) {
		if (
			path.get(i).data.type == "special" ||
			path.get(i).data.type == "AccessNode"
		) {
			distance = distance - 1;
		}
	}
	return distance;
}

/**
collectPaths(Node, Node) produces a collection of all paths from one Node to another.
This is used by listAllPaths and collect collectEveryPaths
The result is remembered in a global variable which is used by highlightSelectedPath.
This does not depend on findDistances.
Input: Source node and destination node
Output: Recusively find All path from the source node to destination node
**/
function collectPaths(begin, end) {
	var stack = new go.List(/*go.Node*/);
	var coll = new go.List(/*go.List*/);

	function find(source, end) {
		source.findNodesOutOf().each((n) => {
			if (n === source) return;
			if (n === end) {
				// success
				var path = stack.copy();
				path.add(end);
				coll.add(path);
			} else if (!stack.has(n)) {
				stack.add(n);
				find(n, end);
				stack.removeAt(stack.count - 1);
			}
		});
	}
	stack.add(begin);
	find(begin, end);
	return coll;
}

/**
Input: GoJS Path
Output: Turn the GoJS path to string to show in HTML tag
**/
function pathToString(path) {
	var s = path.length - 1 + ": ";
	for (var i = 0; i < path.length; i++) {
		if (i > 0) s += " -- ";
		s += path.get(i).data.key;
	}
	return s;
}

/**
collectEveryPaths produces a collection of all paths from the Node without NodeInto to the Node without NodeOutOf
(Or can be said from the attacker to multiple target)
This is used by the main funtion.
This is calculate right after the drawing process of the middleLayer
This does not depend on findDistances.
Input: After the MiddleLayer finished drawing
Output: Recusively find All path from attacker to target
**/
function collectEveryPaths() {
	var distancearr = [];
	var beginnode = new go.List();
	var outnode = new go.List();
	var numofpath = 0;
	var sel = document.getElementById("allPaths");

	// RESET previous runs to avoid duplicates:
	if (sel) sel.innerHTML = "";
	alpath = new go.List(); // clear old go.List of paths
	allPathsData = []; // clear the structured cache
	displayedPaths = []; // clear filtered view too

	// Find all start/end nodes
	mymiddleHarm.nodes.each(function (node) {
		var nodeInto = node.findNodesInto();
		var nodeOut = node.findNodesOutOf();
		if (nodeInto.count == 0) beginnode.add(node);
		if (nodeOut.count == 0) outnode.add(node);
	});

	// Walk all begin->end pairs and record paths
	beginnode.each(function (n1) {
		outnode.each(function (n2) {
			paths = collectPaths(n1, n2);
			paths.each(function (p) {
				// 1) Build option label (existing UI)
				var optText = pathToString(p);
				if (sel) {
					var opt = document.createElement("option");
					opt.text = optText;
					sel.add(opt, null);
				}
				numofpath++;

				// 2) Maintain your existing derived data
				var dist = calculateDistance(p);
				distancearr.push(dist);
				alpath.add(p);

				// 3) NEW: compute per-path meta (impact/probability/risk)
				var pathImpactMax = 0;
				var pathProbProduct = 1;
				var riskSum = 0;

				for (var i = 0; i < p.length; i++) {
					var node = p.get(i);
					if (!node || !node.data) continue;

					// Only consider real component/access nodes (skip attacker and groups)
					var t = node.data.type;
					if (t !== "component" && t !== "AccessNode") continue;

					var key = node.data.key;
					var nImp = getNodeImpactByKey(key) || 0;
					var nProb = getNodeProbabilityByKey(key) || 0;

					if (nImp > pathImpactMax) pathImpactMax = nImp;
					pathProbProduct *= nProb > 0 ? nProb : 1; // if no prob known, neutral multiply by 1
					riskSum += nProb * nImp; // additive risk across nodes
				}

				var riskMul = pathImpactMax * pathProbProduct;

				// track end node key
				var lastNode = p.get(p.length - 1);
				var endKey = lastNode && lastNode.data ? lastNode.data.key : "";

				// 4) Store enriched record for filtering + table rendering
				allPathsData.push({
					path: p,
					label: optText,
					endKey: endKey,
					meta: {
						impact: round2(pathImpactMax),
						probability: round4(pathProbProduct),
						riskSum: round4(riskSum),
						riskMul: round4(riskMul)
					}
				});
			});

			if (sel) sel.onchange = highlightThisPath;
		});
	});

	// UI counts
	var numofallPath = document.getElementById("numofallPath");
	if (numofallPath) numofallPath.innerHTML = "Number of path: " + numofpath;

	var shortestattackpath = distancearr.length
		? Math.min.apply(null, distancearr)
		: 0;
	var longestattackpath = distancearr.length
		? Math.max.apply(null, distancearr)
		: 0;
	console.log("Shortest attack path: " + shortestattackpath);
	console.log("Longest attack path: " + longestattackpath);

	// Ensure the checkbox panel reflects current nodes and render list once (no filters)
	buildEndNodeCheckboxes();
	renderAllPathsSelect([]); // populates displayedPaths

	// Also refresh the Path Information table with everything by default
	updatePathInformation([]);
}

function round2(x) {
	return Math.round((x + Number.EPSILON) * 100) / 100;
}
function round4(x) {
	return Math.round((x + Number.EPSILON) * 10000) / 10000;
}

function calculateDistance(path) {
	var distance = path.length;
	for (var i = 0; i < path.length; i++) {
		if (path.get(i).data.type == "special") {
			distance = distance - 1;
		}
	}
	return distance;
}

/**
This function is used by collectEveryPaths to hightlight the selected path
Input: collectEveryPaths call
Output: Highlight selected path
**/
function highlightThisPath() {
	var sel = document.getElementById("allPaths");
	highlightPath(alpath.get(sel.selectedIndex));
}

/********************************************************
=========================================================
============THE CALCULATION START FROM HERE==============
=========================================================
********************************************************/

/**
This function is the main function for security analysis
Input: data ready for 3 IVHARM layers
Output: Fill table of probability, impact and risk of node in upperlayer and middlelayer
**/
function nodeInfo() {
	fatherimparr = getImpactOfUnit();
	fatherprobarr = getProbOfUnit();
	fathersumimpact = getSumImpactOfUnit();

	// pathInfo();
	const adj = buildAdjacency();
	const betweenness = betweennessCentrality(adj);
	const closeness = closenessCentrality(adj);
	maxImpMap = getMaxVulnImpactOfMiddleNodes();
	sumImpMap = getSumVulnImpactOfMiddleNodes();
	// getProbOfUnit();
	mymiddleHarm.nodes.each((n) => {
		if (n.data.type == "component") {
			parentnode = mylowerHarm.findNodeForKey(n.data.key);

			totalRiskLink = 0;
			n.findLinksInto().each((link) => {
				const linkData = link.data;
				const threats = getThreatsForLink(linkData);
				totalRiskLink += sumThreatImpacts(threats);
			});

			if (parentnode == null && totalRiskLink == 0) {
				return;
			}
			prob = getProbOfNode(parentnode);
			impact = maxImpMap[n.data.key] || 0;
			links = n.findLinksOutOf().count;

			risk = prob * sumImpMap[n.data.key];
			risk_round = Math.round(risk * 100) / 100;

			// Link impact
			totalRiskLink = 0;
			n.findLinksInto().each((link) => {
				const linkData = link.data;
				const threats = getThreatsForLink(linkData);
				totalRiskLink += sumThreatImpacts(threats);
			});
			totalRiskLink = Math.round(totalRiskLink * 100) / 100;

			$("#serviceinfotable").append(
				"<tr><td>" +
					n.data.key +
					"</td><td>" +
					prob +
					"</td><td>" +
					impact +
					"</td><td>" +
					risk_round +
					"</td><td>" +
					totalRiskLink +
					"</td><td>" +
					betweenness[n.data.key].toFixed(2) +
					"</td><td>" +
					closeness[n.data.key].toFixed(2) +
					"</td><td>" +
					links +
					"</td><tr>"
			);
		} else if (n.data.type == "segment") {
			impact = fatherimparr[n.data.key];
			prob = fatherprobarr[n.data.key];
			risk = prob * fathersumimpact[n.data.key];
			risk_round = Math.round(risk * 100) / 100;
			$("#unitinfotable").append(
				"<tr><td>" +
					n.data.key +
					"</td><td>" +
					prob +
					"</td><td>" +
					impact +
					"</td><td>" +
					risk_round +
					"</td><tr>"
			);
		}
	});
}

function getIncomingLinksForNode(diagram, nodeKey) {
	const node = diagram.findNodeForKey(nodeKey);
	if (!node) return [];
	const it = node.findLinksInto();
	const links = [];
	while (it.next()) links.push(it.value);
	return links;
}

function sumThreatImpacts(threats) {
	let s = 0;
	for (const t of threats) s += typeof t.risk === "number" ? t.risk : 0;
	return Math.round(s * 100) / 100;
}

function getThreatsForLink(linkData) {
	const results = [];
	if (!linkData || !linkVuln) return results;

	const ct = (linkData.connecttype || "").toUpperCase();
	const proto = (linkData.protocol || "").toUpperCase();

	if (linkVuln[proto]) results.push(...linkVuln[proto]);
	if (linkVuln[ct]) results.push(...linkVuln[ct]);

	return results.map((t) => ({
		id: t.id,
		name: t.name,
		risk: Math.round(t.risk * 100) / 100
	}));
}

// Build adjacency list from GoJS model
function buildAdjacency() {
	model = mymiddleHarm.model;
	const adj = {};
	model.nodeDataArray.forEach((n) => (adj[n.key] = []));
	model.linkDataArray.forEach((l) => adj[l.from].push(l.to));
	return adj;
}

function betweennessCentrality(adj) {
	const nodes = Object.keys(adj);
	const Cb = {};
	nodes.forEach((v) => (Cb[v] = 0));

	nodes.forEach((s) => {
		const S = [];
		const P = {};
		const sigma = {};
		const d = {};
		const Q = [];

		nodes.forEach((v) => {
			P[v] = [];
			sigma[v] = 0;
			d[v] = -1;
		});

		sigma[s] = 1;
		d[s] = 0;
		Q.push(s);

		// BFS to compute shortest paths
		while (Q.length > 0) {
			const v = Q.shift();
			S.push(v);
			adj[v].forEach((w) => {
				if (d[w] < 0) {
					Q.push(w);
					d[w] = d[v] + 1;
				}
				if (d[w] === d[v] + 1) {
					sigma[w] += sigma[v];
					P[w].push(v);
				}
			});
		}

		const delta = {};
		nodes.forEach((v) => (delta[v] = 0));

		// Back-propagation
		while (S.length > 0) {
			const w = S.pop();
			P[w].forEach((v) => {
				delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
			});
			if (w !== s) {
				Cb[w] += delta[w];
			}
		}
	});

	return Cb;
}

function closenessCentrality(adj) {
	const nodes = Object.keys(adj);
	const Cc = {};
	const N = nodes.length;

	function bfs(start) {
		const dist = {};
		nodes.forEach((v) => (dist[v] = -1));
		dist[start] = 0;
		const Q = [start];
		while (Q.length > 0) {
			const v = Q.shift();
			adj[v].forEach((w) => {
				if (dist[w] < 0) {
					dist[w] = dist[v] + 1;
					Q.push(w);
				}
			});
		}
		return dist;
	}

	nodes.forEach((v) => {
		const dist = bfs(v);
		let totalDist = 0;
		let reachable = 0;
		for (const t of nodes) {
			if (t !== v && dist[t] >= 0) {
				totalDist += dist[t];
				reachable++;
			}
		}
		if (totalDist > 0) {
			Cc[v] = reachable / totalDist; // normalized closeness
		} else {
			Cc[v] = 0;
		}
	});

	return Cc;
}

function getLowerLeaves(root, filterFn) {
	const leaves = [];
	if (!root) return leaves;

	const stack = [root];
	while (stack.length) {
		const n = stack.pop();
		let hasChild = false;

		if (typeof n.findTreeChildrenNodes === "function") {
			n.findTreeChildrenNodes().each((ch) => {
				hasChild = true;
				stack.push(ch);
			});
		} else if (Array.isArray(n.children)) {
			if (n.children.length) {
				hasChild = true;
				for (const ch of n.children) stack.push(ch);
			}
		}

		if (!hasChild) {
			if (!filterFn || filterFn(n)) leaves.push(n);
		}
	}
	return leaves;
}

const isVulnLeaf = (n) =>
	n?.data?.type === "vulnerability" || typeof n?.data?.impact === "number";

function getMaxVulnImpactOfMiddleNodes() {
	const mapping = {};
	mymiddleHarm.nodes.each((n) => {
		if (n.data.type === "component" || n.data.type === "AccessNode") {
			const lowerNode = mylowerHarm.findNodeForKey(n.data.key);
			const leaves = getLowerLeaves(lowerNode, isVulnLeaf);
			let maxImpact = 0;
			for (const leaf of leaves) {
				const imp = Number(leaf?.data?.impact) || 0;
				if (imp > maxImpact) maxImpact = imp;
			}

			mapping[n.data.key] = maxImpact;
		}
	});
	return mapping;
}

function getSumVulnImpactOfMiddleNodes() {
	const mapping = {};
	mymiddleHarm.nodes.each((n) => {
		if (n.data.type === "component" || n.data.type === "AccessNode") {
			const lowerNode = mylowerHarm.findNodeForKey(n.data.key);
			const leaves = getLowerLeaves(lowerNode, isVulnLeaf);
			const totalImpact = leaves.reduce(
				(acc, leaf) => acc + (Number(leaf?.data?.impact) || 0),
				0
			);
			mapping[n.data.key] = totalImpact;
		}
	});
	return mapping;
}

// Collect actual leaf *nodes* (not just values) under a lower-layer node
function getLeafNodesOfNode(root) {
	const leaves = [];
	if (!root) return leaves;
	function dfs(n) {
		if (!n) return;
		const kids = n.findTreeChildrenNodes();
		if (kids.count === 0) return;
		kids.each((child) => {
			if (child.data.type === "gate") {
				dfs(child);
			} else if (child.data.type === "vulnerability") {
				leaves.push(child);
			}
		});
	}
	dfs(root);
	return leaves;
}

function showstringpath(path) {
	var s = "";
	for (var i = 0; i < path.length; i++) {
		if (i > 0) s += " -- ";
		s += path.get(i).data.key;
	}
	return s;
}

function getImpactofPath(path) {
	maxImpMap = getMaxVulnImpactOfMiddleNodes();

	var impact = 0;
	var imparr = [];
	for (var i = 0; i < path.length; i++) {
		if (
			path.get(i).data.type == "component" ||
			path.get(i).data.type == "AccessNode"
		) {
			tmp_impact = maxImpMap[path.get(i).data.key] || 0;

			imparr.push(tmp_impact);
		}
	}
	impact = imparr.reduce((sum, val) => sum + val, 0);
	return impact;
}

function getProbOfPath(path) {
	var prob = 0;
	var probarr = [];
	var listprob = getListProbOfNode();
	for (var i = 0; i < path.length; i++) {
		if (
			path.get(i).data.type == "component" ||
			path.get(i).data.type == "AccessNode"
		) {
			tmp_prob = listprob[path.get(i).data.key];
			if (tmp_prob == 0) {
				continue;
			}
			probarr.push(tmp_prob);
		}
	}
	if (probarr.length == 0) return 0;
	prob = probarr.reduce((a, b) => a * b);
	return Math.round(prob * 100) / 100;
}

/**
This function is used for function getProbOfNode
Input: the gatefigure and array of probability inside the gate
Output: calculate the probability of the gate
**/
function getProbOfGate(figure, probarr) {
	var prob = 0;
	if (figure == "OrGate") {
		reversearr = probarr.map((x) => 1 - x);
		reverseprob = reversearr.reduce((a, b) => a * b);
		prob = 1 - reverseprob;
	} else if (figure == "AndGate") {
		prob = probarr.reduce((a, b) => a * b);
	} else {
		prob = probarr;
	}
	return Math.round(prob * 100) / 100;
}

/**
This function is used to calculate probability of the parent node in lowerlayer
Input: parent node in lowerlayer
Output: calculate the probability of the parent node in lowerlayer
**/
function getProbOfNode(pnode) {
	var probarr = [];
	if (pnode === null) return 0;
	var figure = pnode.data.figure;
	children = pnode.findTreeChildrenNodes();
	if (children.count > 0) {
		children.each((child) => {
			if (child.data.type == "gate") {
				var temp_prob1 = getProbOfNode(child);
				child.data.prob = temp_prob1;
				probarr.push(temp_prob1);
			} else {
				var temp_prob = child.data.prob;
				probarr.push(temp_prob);
			}
		});
	}
	prob_value = getProbOfGate(figure, probarr);
	return prob_value;
}
/**
This function is used to calculate impact of the parent node in lowerlayer
Input: parent node in lowerlayer
Output: calculate the impact of the parent node in lowerlayer
**/
function getImpactOfNode(pnode) {
	var impactarr = [];
	if (pnode === null) return 0;
	var figure = pnode.data.figure;
	var children = pnode.findTreeChildrenNodes();
	if (children.count > 0) {
		children.each((child) => {
			// Always get impact from lowerlayer node
			var lowerNode = mylowerHarm.findNodeForKey(child.data.key);
			if (lowerNode && lowerNode.data.impact !== undefined) {
				impactarr.push(lowerNode.data.impact);
			} else if (child.data.type == "gate") {
				var temp_impact1 = getImpactOfNode(child);
				child.data.impact = temp_impact1;
				impactarr.push(temp_impact1);
			} else {
				// var temp_impact = child.data.impact;
				// impactarr.push(temp_impact);
			}
		});
	}
	let gateImpact = 0;
	if (figure == "OrGate") {
		gateImpact = impactarr.length > 0 ? Math.max(...impactarr) : 0;
	} else if (figure == "AndGate") {
		gateImpact =
			impactarr.length > 0 ? impactarr.reduce((a, b) => a + b, 0) : 0;
	} else {
		gateImpact = impactarr.length > 0 ? impactarr[0] : 0;
	}
	return gateImpact;
}

function getSumImpactOfUnit() {
	maxImpMap = getMaxVulnImpactOfMiddleNodes();
	var fatherarr = [];
	myupperHarm.nodes.each((n) => {
		if (n.data.type == "segment") {
			father = n.data.key;
			fatherarr.push(father);
		}
	});
	var fathersumimparr = [];
	fatherarr.forEach((e) => {
		var temparr = [];
		mymiddleHarm.nodes.each((n) => {
			if (n.data.type == "component" || n.data.type == "AccessNode") {
				if (
					n.data.group == e ||
					mymiddleHarm.findNodeForKey(n.data.group)?.data.group == e
				) {
					temparr.push(maxImpMap[n.data.key] || 0);
				}
			}
		});
		var sumimp = temparr.reduce((sum, current) => sum + current, 0);
		fathersumimparr[e] = sumimp;
	});
	return fathersumimparr;
}

/**
This function is used by NodeInfo() to get the probability of Unit
Input: data ready for 3 IVHARM layers
Output: Probability of node in Upper layer (called Unit)
**/
function getProbOfUnit() {
	var fatherarr = [];
	var fatherprobarr = [];
	var listprob = getListProbOfNode();
	//get the array of all father
	myupperHarm.nodes.each((n) => {
		if (
			n.data.type == "ECU" ||
			n.data.type == "CANBUS" ||
			n.data.type == "segment"
		) {
			father = n.data.key;
			fatherarr.push(father);
		}
	});

	fatherarr.forEach((e) => {
		var temparr = [];
		mymiddleHarm.nodes.each((n) => {
			if (n.data.type == "component" || n.data.type == "AccessNode") {
				if (
					n.data.group == e ||
					mymiddleHarm.findNodeForKey(n.data.group)?.data.group == e
				) {
					prob = listprob[n.data.key];
					if (prob != 0) {
						temparr.push(prob);
					}

					// temparr.push(listprob[n.data.key]);
					// console.log (n.data.key + "---" + listprob[n.data.key]);
				}
			}
		});
		if (temparr.length == 0) {
			fatherprobarr[e] = 0;
			return;
		}
		var unitprob = temparr.reduce((a, b) => a * b);
		fatherprobarr[e] = Math.round(unitprob * 100) / 100;
	});
	return fatherprobarr;
}

/**
This function is used by NodeInfo() to get the impact of Unit
Input: data ready for 3 IVHARM layers
Output: Impact of node in Upper layer (called Unit)
**/
function getImpactOfUnit() {
	maxImpMap = getMaxVulnImpactOfMiddleNodes();
	var fatherarr = [];
	myupperHarm.nodes.each((n) => {
		if (
			n.data.type == "ECU" ||
			n.data.type == "CANBUS" ||
			n.data.type == "segment"
		) {
			father = n.data.key;
			fatherarr.push(father);
		}
	});
	var fatherimparr = [];
	fatherarr.forEach((e) => {
		var temparr = [];
		mymiddleHarm.nodes.each((n) => {
			if (n.data.type == "component" || n.data.type == "AccessNode") {
				if (
					n.data.group == e ||
					mymiddleHarm.findNodeForKey(n.data.group)?.data.group == e
				) {
					temparr.push(maxImpMap[n.data.key] || 0);
				}
			}
		});
		var maximp = Math.max(...temparr);
		fatherimparr[e] = maximp;
	});
	return fatherimparr;
}

/**
This function is used by getProbOfUnit() to get the probability of node in the middle layer
Input: data ready for 3 IVHARM layers
Output: Array of impact of middle layer node
**/
function getListImpactOfNode() {
	var listnodeimp = [];
	mymiddleHarm.nodes.each((n) => {
		if (n.data.type == "component" || n.data.type == "AccessNode") {
			// impact = getImpactOfNode(n);
			impact = n.data.impact;
			listnodeimp[n.data.key] = impact;
		}
	});
	// console.log(listnodeimp);
	return listnodeimp;
}

/**
This function is used by getProbOfUnit() to get the probability of node in the middle layer
Input: data ready for 3 IVHARM layers
Output: Array of probability of middle layer node
**/
function getListProbOfNode() {
	var listnodeprob = [];
	mymiddleHarm.nodes.each((n) => {
		if (n.data.type == "component" || n.data.type == "AccessNode") {
			parentnode = mylowerHarm.findNodeForKey(n.data.key);
			if (parentnode === null) {
				listnodeprob[n.data.key] = 0;
				return;
			}
			prob = getProbOfNode(parentnode);
			listnodeprob[n.data.key] = prob;
		}
	});
	return listnodeprob;
}

/**
This function is used by getProbOfUnit() to get the risk of node in the middle layer
Input: data ready for 3 IVHARM layers
Output: Array of risk of middle layer node
**/
function getListRiskOfNode() {
	var listriskofnode = [];
	var listprob = getListProbOfNode();
	var listimp = getListImpactOfNode();
	mymiddleHarm.nodes.each((n) => {
		if (n.data.type == "component" || n.data.type == "AccessNode") {
			imp = listimp[n.data.key];
			prob = listprob[n.data.key];
			risk = imp * prob;
			risk_round = Math.round(risk * 100) / 100;
			listriskofnode[n.data.key] = risk_round;
		}
	});
	// console.log(listnodeprob);
	return listriskofnode;
}

function getRiskOfNode(pnode) {
	if (pnode === null) return 0;
	var probarr = [];
	var impactarr = [];
	var figure = pnode.data.figure;
	var children = pnode.findTreeChildrenNodes();
	if (children.count > 0) {
		children.each((child) => {
			if (child.data.type == "gate") {
				var childRisk = getRiskOfNode(child);
				probarr.push(getProbOfNode(child));
				impactarr.push(getImpactOfNode(child));
			} else {
				probarr.push(child.data.prob);
				impactarr.push(child.data.impact);
			}
		});
	}
	var gateProb = getProbOfGate(figure, probarr);
	// Impact aggregation logic:
	var gateImpact = 0;
	if (figure == "OrGate") {
		gateImpact = impactarr.length > 0 ? Math.max(...impactarr) : 0;
	} else if (figure == "AndGate") {
		gateImpact = impactarr.length > 0 ? Math.sum(...impactarr) : 0;
	} else {
		gateImpact = impactarr.length > 0 ? impactarr[0] : 0;
	}
	// Risk calculation
	var risk = gateProb * gateImpact;
	return Math.round(risk * 100) / 100;
}

/********************************************************
=========================================================
============WORKING WITH EDGE FUNCTIONS==================
=========================================================
********************************************************/
function pathToString1(path) {
	var vec = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	var s = path.length - 1 + ": ";
	var listnode = "";
	for (var i = 0; i < path.length; i++) {
		if (i > 0) {
			s += "--";
			listnode += ",";
		}
		s += path.get(i).data.key;
		listnode += path.get(i).data.key;
	}

	nodearr = listnode.split(",");
	for (var i = 0; i <= nodearr.length; i++) {
		if (i + 1 == nodearr.length) return vec;
		else {
			console.log("Path: " + nodearr[i] + "--" + nodearr[i + 1]);
			beginnode = mymiddleHarm.findNodeForKey(nodearr[i]);
			nextnode = mymiddleHarm.findNodeForKey(nodearr[i + 1]);
			var l = beginnode.findLinksTo(nextnode).each(function (link) {
				linkvec = link.data.vec;
				console.log("vecoflink:" + linkvec);
				var arrvec = JSON.parse(linkvec);
				vec = addvector(vec, arrvec);
				console.log("vec la: " + vec);
			});
		}
	}
}

function collectEdge(begin, end) {
	var vec = [0, 0, 0, 0, 0, 0, 0, 0, 0];
	var stack = new go.List(/*go.Node*/);
	var coll = new go.List(/*go.List*/);
	var edge = new go.List(/*go.Edge*/);

	function find(source, end) {
		source.findNodesOutOf().each((n) => {
			if (n === source) return;
			if (n === end) {
				// success
				var l = source.findLinksTo(end).each(function (link) {
					linkvec = link.data.vec;
					console.log("vecoflink:" + linkvec);
					var arrvec = JSON.parse(linkvec);
					vec = addvector(vec, arrvec);
				});
				var path = stack.copy();
				path.add(end);
				coll.add(path);
			} else if (!stack.has(n)) {
				stack.add(n);
				find(n, end);
				stack.removeAt(stack.count - 1);
			}
		});
	}
	stack.add(begin);
	find(begin, end);
	console.log("vec la: " + vec);
}

function addvector(a, b) {
	return a.map((e, i) => e + b[i]);
}
