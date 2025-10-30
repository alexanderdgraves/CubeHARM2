var lowerLayer = (function () {
	// console.log("Start creating lowerLayer");
	const $ = go.GraphObject.make;
	var creatingDiagram = function () {
		// console.log('LowerLayer-CreateingLowerTree');
		mylowerHarm = $(go.Diagram, "lowerlayer", {
			allowCopy: false,
			allowDelete: false,
			"draggingTool.dragsTree": true,
			layout: $(go.TreeLayout, { angle: 90, layerSpacing: 30 }),
			"undoManager.isEnabled": true
		});
	};

	var settingNodeTemplate = function () {
		// console.log('LowerLayer-SettingTreeNode');
		mylowerHarm.nodeTemplate = // the default node template
			$(
				go.Node,
				"Spot",
				{
					selectionObjectName: "BODY",
					locationSpot: go.Spot.Center,
					locationObjectName: "BODY"
				},
				// the main "BODY" consists of a Rectangle surrounding some text
				$(
					go.Panel,
					"Auto",
					{ name: "BODY", portId: "" },
					$(go.Shape, { fill: "white", stroke: "whitesmoke" }),
					$(
						go.TextBlock,
						{
							margin: new go.Margin(2, 10, 1, 10),
							maxSize: new go.Size(100, NaN),
							stroke: "Black",
							font: "10pt Segoe UI, sans-serif"
						},
						new go.Binding("text", "", function (data) {
							return data.name || data.key;
						})
					)
					// new go.Binding("text", "key"))
				), // end "BODY", an Auto Panel
				$("TreeExpanderButton", {
					alignment: go.Spot.Right,
					alignmentFocus: go.Spot.Left,
					"ButtonBorder.figure": "Rectangle"
				}),
				$(
					go.Shape,
					"LineV",
					new go.Binding("visible", "figure", (f) => f !== "None"),
					{
						strokeWidth: 1.5,
						height: 20,
						alignment: new go.Spot(0.5, 1, 0, -1),
						alignmentFocus: go.Spot.Top
					}
				),
				$(
					go.Shape,
					new go.Binding("visible", "figure", (f) => f !== "None"),
					{
						alignment: new go.Spot(0.5, 1, 0, 5),
						alignmentFocus: go.Spot.Top,
						width: 30,
						height: 30,
						stroke: "black",
						fill: "whitesmoke"
					},
					new go.Binding("figure"),
					new go.Binding("angle", "figure", (f) =>
						f === "OrGate" || f === "AndGate" ? -90 : 0
					)
				) // ORs and ANDs should point upwards
			);
	};

	var settingEdgeTemplate = function () {
		// console.log('LowerLayer-SettingTreeEdge');
		mylowerHarm.linkTemplate = $(
			go.Link,
			go.Link.Orthogonal,
			{ layerName: "Background", curviness: 20, corner: 5 },
			$(go.Shape, { strokeWidth: 1.5 })
		);
	};

	var generateGraph = function (lowerNodedata) {
		// console.log('LowerLayer-Drawing');
		var nodeDataArray = lowerNodedata;
		// var nodeDataArray = [
		//      {"key":"Browser","figure":"None"},
		//      {"key":"vul1","parent":"Browser", "figure":"None", "prob":"0.45"},
		//
		//      {"key":"Intel Kernel","figure":"OrGate"},
		//      {"key":"vul2","parent":"Intel Kernel", "figure":"None","prob":"0.45"},
		//      {"key":"AND","parent":"Intel Kernel", "figure":"AndGate"},
		//      {"key":"vul3","parent":"AND", "figure":"None","prob":"0.22"},
		//      {"key":"vul4","parent":"AND", "figure":"None","prob":"0.45"},
		//
		//      {"key":"TiDra Kernel","figure":"None"},
		//      {"key":"vul5","parent":"TiDra Kernel", "figure":"None","prob":"0.375"},
		//
		//
		//      {"key":"Qualcomm Kernel","figure":"AndGate"},
		//      {"key":"vul6","parent":"Qualcomm Kernel", "figure":"None","prob":"0.975"},
		//      {"key":"vul7","parent":"Qualcomm Kernel", "figure":"None","prob":"0.975"}
		// ];
		mylowerHarm.model = new go.TreeModel(nodeDataArray);
	};

	return {
		init: function (lowerNodedata) {
			// console.log('LowerLayer Creating...');
			creatingDiagram();
			settingNodeTemplate();
			settingEdgeTemplate();
			generateGraph(lowerNodedata);
		}
	};
})();

// // when the document is modified, add a "*" to the title and enable the "Save" button
// myDiagram.addDiagramListener("Modified", e => {
//   var button = document.getElementById("SaveButton");
//   if (button) button.disabled = !myDiagram.isModified;
//   var idx = document.title.indexOf("*");
//   if (myDiagram.isModified) {
//     if (idx < 0) document.title += "*";
//   } else {
//     if (idx >= 0) document.title = document.title.slice(0, idx);
//   }
// });

//
//
// load();
