var upperLayer = (function () {
	const $ = go.GraphObject.make;
	var creatingDiagram = function () {
		// console.log('UpperLayer-CreateingDiagram');
		myupperHarm = $(go.Diagram, "upperlayer", {
			initialAutoScale: go.Diagram.Uniform,
			contentAlignment: go.Spot.Center,
			layout: $(go.ForceDirectedLayout, {
				defaultSpringLength: 10,
				maxIterations: 300
			}),
			maxSelectionCount: 2
		});
		myupperHarm.zoomToRect(myupperHarm.documentBounds);
	};

	var settingNodeTemplate = function () {
		// console.log('UpperLayer-SettingNode');
		myupperHarm.nodeTemplate = $(
			go.Node,
			"Auto",
			{
				locationSpot: go.Spot.Center, // Node.location is the center of the Shape
				selectionAdorned: false
				// selectionChanged: nodeSelectionChanged
			},
			$(
				go.Shape,
				"Circle",
				{
					fill: "white",
					width: 70,
					height: 70
				},
				new go.Binding("fill", "type", setcolor)
			),
			$(
				go.TextBlock,
				{
					font: "10px sans-serif",
					stroke: "#333",
					margin: 6,
					isMultiline: false,
					editable: false
				},
				new go.Binding("text", "key")
			)
		);
	};

	var settingEdgeTemplate = function () {
		// console.log('UpperLayer-SettingEdge');
		myupperHarm.linkTemplate = $(
			go.Link,
			{ selectable: false, layerName: "Background" },
			$(
				go.Shape, // this shape only shows when it isHighlighted
				{
					isPanelMain: true,
					stroke: null,
					strokeWidth: 5
				},
				new go.Binding("stroke", "isHighlighted", (h) =>
					h ? "red" : null
				).ofObject()
			),
			$(
				go.Shape,
				{
					isPanelMain: true,
					stroke: "black",
					strokeWidth: 1
				},
				new go.Binding("stroke", "color"),
				new go.Binding("strokeDashArray", "connecttype", setconnecttype)
			),
			$(go.Shape, {
				toArrow: "Standard"
			})
		);
	};

	var generateGraph = function (upperNodeData, upperLinkData) {
		// console.log('UpperLayer-Drawing');
		var nodeDataArray = upperNodeData;
		var linkDataArray = upperLinkData;
		// var nodeDataArray = [
		//    {"key":"A"},
		//    {"key":"HU"},
		//    {"key":"TU"},
		//    {"key":"KCAN ECUs"},
		//    {"key":"PTCAN ECUs"}
		// ];
		// var linkDataArray= [
		//    {"from": "A", "to":"HU"},
		//    {"from": "A", "to":"TU"},
		//    {"from": "HU", "to":"KCAN ECUs", "dash": [3, 1]},
		//    {"from": "HU", "to":"PTCAN ECUs", "dash": [7, 7]},
		//    {"from": "TU", "to":"KCAN ECUs", "dash": [7, 7]},
		//    {"from": "TU", "to":"PTCAN ECUs", "dash": [7, 7]}
		// ];
		myupperHarm.model = new go.GraphLinksModel(
			nodeDataArray,
			linkDataArray
		);
	};

	function setcolor(c) {
		switch (c) {
			case "special":
				return "#db9ca2";
			case "AccessNode":
				return "#fdebb4";
			default:
				return "#ffffff";
		}
	}
	function setconnecttype(ct) {
		switch (ct) {
			case "CAN":
				return [4, 2];
			case "UDS":
				return [7, 7];
			default:
				return "";
		}
	}
	return {
		init: function (upperNodeData, upperLinkData) {
			// console.log('UpperLayer Creating...');
			creatingDiagram();
			settingNodeTemplate();
			settingEdgeTemplate();
			generateGraph(upperNodeData, upperLinkData);
		}
	};
})();
