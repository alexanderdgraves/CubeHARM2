(function ($) {
	$(document).ready(function () {
		var upperNode = [];
		var upperLink = [];
		var middleNode = [];
		var middleLink = [];
		var lowerdata = [];
		window.linkVuln = [];

		// Function to execute button: "Process this JSON" from main page
		$("#jsonprocess").click(function () {
			jsondata = $("#myJsonData").val();
			if (!$.trim(jsondata)) {
				alert("No Data to Process!");
			} else {
				jsonObj = JSON.parse(jsondata);
				if (jsonObj["Architecture"] !== undefined) {
					processFirstData(jsonObj);
					IVHARM_process(
						upperNode,
						upperLink,
						middleNode,
						middleLink,
						lowerdata
					);
				} else if (jsonObj["AddNewVul"] !== undefined) {
					var maxnumberofvul = 10;
					for (var i = 1; i <= maxnumberofvul; i++) {
						var addnum = "add" + i;
						console.log(
							"-------------Analystic " +
								addnum +
								"---------------"
						);
						var jsonObji = jsonObj["AddNewVul"][addnum];
						processFirstData(jsonObji);
						//upperNode = jsonObji['upperLayer']['nodeDataArray'];
						//upperLink = jsonObji['upperLayer']['linkDataArray'];
						// middleNode = jsonObji['middleLayer']['nodeDataArray'];
						//middleLink = jsonObji['middleLayer']['linkDataArray'];
						//lowerdata = jsonObji['lowerLayer'];
						IVHARM_process(
							upperNode,
							upperLink,
							middleNode,
							middleLink,
							lowerdata
						);
						if (i < maxnumberofvul) {
							myupperHarm.div = null;
							mymiddleHarm.div = null;
							mylowerHarm.div = null;
						}
					}
				} else if (jsonObj["DefenseOnIDS"] !== undefined) {
					var maxnumberofvul = 10;
					for (var i = 1; i <= maxnumberofvul; i++) {
						var accurate = "accuracy_" + i;
						console.log(
							"----Analystic accuracy_" + i / 10 + "-----"
						);
						var jsonObji = jsonObj["DefenseOnIDS"][accurate];
						processFirstData(jsonObji);
						IVHARM_process(
							upperNode,
							upperLink,
							middleNode,
							middleLink,
							lowerdata
						);
						if (i < maxnumberofvul) {
							myupperHarm.div = null;
							mymiddleHarm.div = null;
							mylowerHarm.div = null;
						}
					}
				} else if (jsonObj["Obfuscation"] !== undefined) {
					var maxnumberofvul = 10;
					for (var i = 2; i <= maxnumberofvul; i += 2) {
						var accurate = "accuracy_" + i;
						console.log(
							"----Analystic accuracy_" + i / 10 + "-----"
						);
						var jsonObji = jsonObj["Obfuscation"][accurate];
						processFirstData(jsonObji);
						IVHARM_process(
							upperNode,
							upperLink,
							middleNode,
							middleLink,
							lowerdata
						);
						if (i < maxnumberofvul) {
							myupperHarm.div = null;
							mymiddleHarm.div = null;
							mylowerHarm.div = null;
						}
					}
				} else if (jsonObj["SignalDefense"] !== undefined) {
					var maxnumberofvul = 10;
					for (var i = 2; i <= maxnumberofvul; i += 2) {
						var accurate = "accuracy_" + i;
						console.log(
							"----Analystic accuracy_" + i / 10 + "-----"
						);
						var jsonObji = jsonObj["SignalDefense"][accurate];
						processFirstData(jsonObji);
						IVHARM_process(
							upperNode,
							upperLink,
							middleNode,
							middleLink,
							lowerdata
						);
						if (i < maxnumberofvul) {
							myupperHarm.div = null;
							mymiddleHarm.div = null;
							mylowerHarm.div = null;
						}
					}
				} else if (jsonObj["upperLayer"] !== undefined) {
					upperNode = jsonObj["upperLayer"]["nodeDataArray"];
					upperLink = jsonObj["upperLayer"]["linkDataArray"];
					middleNode = jsonObj["middleLayer"]["nodeDataArray"];
					middleLink = jsonObj["middleLayer"]["linkDataArray"];
					lowerdata = jsonObj["lowerLayer"];
					IVHARM_process(
						upperNode,
						upperLink,
						middleNode,
						middleLink,
						lowerdata
					);
				} else {
					alert("Sorry! Your data is not suitable for our analysis!");
				}
			}
		});

		// Function to execute button: "Clear first!" from the main page
		$("#cleardt").click(function () {
			location.reload();
		});

		// Calling function to give IVHARM the JSON data
		function IVHARM_process(
			upperNode,
			upperLink,
			middleNode,
			middleLink,
			lowerdata
		) {
			upperLayer.init(upperNode, upperLink);
			middleLayer.init(middleNode, middleLink);
			lowerLayer.init(lowerdata);
			collectEveryPaths();
			$("#resetbtn").click(function () {
				resetNodes();
			});
			nodeInfo();
		}

		function processFirstData(inputobj) {
			upperNode = [];
			upperLink = [];
			middleNode = [];
			middleLink = [];
			lowerdata = [];
			var nodewithvul = [];
			var fathernode = [];

			lowerdata = inputobj["Vulnerability"];
			//console.log("Lower Data")
			//console.log(lowerdata)
			archinode = inputobj["Architecture"]["nodeDataArray"];
			archiarc = inputobj["Architecture"]["linkDataArray"];

			//Get all the node with vulnerabilities
			lowerdata.forEach((obj) => {
				if (obj["type"] == "root") {
					nodewithvul.push(obj["key"]);
				}
			});
			//console.log("Nodes with vulnerabilities")
			//console.log(nodewithvul)

			linkVuln = inputobj["LinkVuln"];

			//MIDDLE LAYER -------- Create node of middle layer
			// nodewithvul.forEach((item) => {
			archinode.forEach((obj) => {
				// if (obj["key"] == item) {
				middleNode.push(obj);
				if (fathernode.indexOf(obj["group"]) === -1) {
					fathernode.push(obj["group"]);
				}
				// }
			});
			// });
			//Add group to middle layer
			archinode.forEach((obj) => {
				fathernode.forEach((item) => {
					if (obj["key"] == item && middleNode.indexOf(obj) === -1) {
						middleNode.push(obj);
					}
				});
			});
			// var attackernode = { key: "A", type: "special" };
			// middleNode.push(attackernode);
			//MIDDLE LAYER -------- Create link of middle node
			var arcwithfromnode;
			var arcwithtonode;
			var tonodeinfo;
			var tempattacker;
			middleNode.forEach((obj) => {
				if (obj.attacksurface == true) {
					tempattacker = {
						from: "A",
						to: obj["key"],
						connectype: "network"
					};
					middleLink.push(tempattacker);
				}
				arcwithtonode = archiarc.filter(
					(item) => item.to == obj["key"]
				);
				if (arcwithtonode !== undefined) {
					arcwithtonode.forEach((d) => {
						middleLink.push(d);
					});
				}
			});
			// console.log("Middle Node");
			// console.log(middleNode);
			// console.log("Middle Link");
			// console.log(middleLink);
			//UPPER LAYER ---------- Create node of middle layers
			var upperNodetemp = JSON.parse(JSON.stringify(middleNode));
			var listaccessnode;
			var listgroupnode;

			listaccessnode = upperNodetemp.filter(
				(item) =>
					item.type == "AccessNode" ||
					item.type == "special" ||
					item.type == "segment"
			);
			listaccessnode.forEach((d) => {
				delete d.isGroup;
				upperNode.push(d);
			});
			// listgroupnode = upperNodetemp.filter(
			// 	(item) => item.isGroup == true
			// );
			// listgroupnode.forEach((d) => {
			// 	if (d.type == "segment") {
			// 		delete d.isGroup;
			// 		upperNode.push(d);
			// 	} else {
			// 		upperNode.push(d);
			// 	}
			// });
			// console.log("Upper Node");
			// console.log(upperNode);
			//UPPER LAYER ---------- Create link of middle layers

			function getSegmentOfNode(key, nodeList) {
				let current = nodeList.find((n) => n.key === key);
				while (current && current.group) {
					const parent = nodeList.find(
						(n) => n.key === current.group
					);
					if (!parent) break;
					if (parent.type === "segment") return parent.key;
					current = parent;
				}
				return null;
			}

			const seenLinks = new Set(); // To avoid duplicates

			middleLink.forEach((link) => {
				const fromSegment = getSegmentOfNode(link.from, middleNode);
				const toSegment = getSegmentOfNode(link.to, middleNode);

				// Only if both are segments and different
				if (fromSegment && toSegment && fromSegment !== toSegment) {
					const linkKey = `${fromSegment}->${toSegment}`;

					if (!seenLinks.has(linkKey)) {
						seenLinks.add(linkKey);

						upperLink.push({
							from: fromSegment,
							to: toSegment,
							connecttype: link.connecttype,
							...(link.protocol && { protocol: link.protocol }) // include protocol if exists
						});
					}
				} else if (link.from === "A") {
					const linkKey = `A->${toSegment}`;
					if (!seenLinks.has(linkKey)) {
						seenLinks.add(linkKey);
						upperLink.push({
							from: "A",
							to: toSegment,
							connecttype: link.connecttype,
							...(link.protocol && { protocol: link.protocol }) // include protocol if exists
						});
					}
				}
			});

			// var nodefrominfo;
			// var nodetoinfo;
			// var upperLinktemp = JSON.parse(JSON.stringify(middleLink));

			// var upperLinktemp1;
			// upperLinktemp.forEach((obj) => {
			// 	// console.log("Processing Link");
			// 	// console.log(obj);
			// 	nodefrominfo = middleNode.find((item) => item.key == obj.from);
			// 	if (nodefrominfo !== undefined) {
			// 		if (
			// 			nodefrominfo["group"] == "HU" ||
			// 			nodefrominfo["group"] == "TCB" ||
			// 			nodefrominfo["group"] == "COM" ||
			// 			nodefrominfo["group"] == "OBC" ||
			// 			nodefrominfo["group"] == "CORE" ||
			// 			nodefrominfo["group"] == "PAY" ||
			// 			nodefrominfo["group"] == "GCOM" ||
			// 			nodefrominfo["group"] == "ITENV" ||
			// 			nodefrominfo["group"] == "UserENV"
			// 		) {
			// 			obj["from"] = nodefrominfo["group"];
			// 		}
			// 	}

			// 	nodetoinfo = middleNode.find((item) => item.key == obj.to);
			// 	if (nodetoinfo !== undefined) {
			// 		// console.log(nodetoinfo);
			// 		if (
			// 			nodetoinfo["group"] == "HU" ||
			// 			nodetoinfo["group"] == "TCB" ||
			// 			nodetoinfo["group"] == "COM" ||
			// 			nodetoinfo["group"] == "OBC" ||
			// 			nodetoinfo["group"] == "CORE" ||
			// 			nodetoinfo["group"] == "PAY" ||
			// 			nodetoinfo["group"] == "GCOM" ||
			// 			nodetoinfo["group"] == "ITENV" ||
			// 			nodetoinfo["group"] == "UserENV"
			// 		) {
			// 			obj["to"] = nodetoinfo["group"];
			// 		}
			// 	}
			// });
			// upperLinktemp.forEach((d) => {
			// 	upperLinktemp1 = upperLinktemp.filter(
			// 		(item) => item.from !== item.to
			// 	);
			// });
			// if (upperLinktemp1 !== undefined) {
			// 	upperLink = upperLinktemp1.filter(
			// 		(item, index, array) =>
			// 			array.findIndex(
			// 				(t) => t.from == item.from && t.to == item.to
			// 			) == index
			// 	);
			// }
			// console.log("Upper Link");
			// console.log(upperLink);
		}
	});
})(jQuery);
