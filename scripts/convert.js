function convertIVNtoArchitecture(ivnData) {
	const { IVN } = ivnData;
	const nodeDataArray = [];
	const linkDataArray = [];
	const vulnerability = [];

	// Add special node
	nodeDataArray.push({ key: "A", type: "special" });

	// Process ECUs
	IVN.ECU.forEach((ecu) => {
		const components = ecu.components;
		const ecuGroupKey = ecu.key;
		let groupBus = ecu.bus;
		let isGroupCreated = false;

		// Determine ECU type for links
		let ecuType = ecu.ecutype;

		components.forEach((component) => {
			const componentKey = component.key;
			const vulnerabilities = component.services.flatMap((service) =>
				service.vuls ? [service.vuls] : []
			);
			let maxImpact = Math.max(
				...vulnerabilities.map(
					(vul) => IVN.VUL.find((v) => v.key === vul).impact
				)
			);
			let attackSurface = component.services.some(
				(service) => service.attacksurface === "true"
			);

			if (vulnerabilities.length > 0) {
				// Create node for the component
				nodeDataArray.push({
					key: componentKey,
					group: ecuGroupKey,
					impact: maxImpact,
					type: "component",
					attacksurface: attackSurface
				});

				// Add links from this component to others it connects to
				component.connection.forEach((conn) => {
					let connectType =
						ecuType === "diagclient" &&
						IVN.ECU.some(
							(e) => e.key === conn && e.ecutype === "diagserver"
						)
							? "UDS"
							: "network";
					linkDataArray.push({
						from: componentKey,
						to: conn,
						connecttype: connectType
					});
				});

				if (!isGroupCreated) {
					nodeDataArray.push({
						key: ecuGroupKey,
						isGroup: true,
						type: ecuType.toUpperCase()
					});
					isGroupCreated = true;
				}
			}
		});

		// Process CAN bus nodes
		if (!nodeDataArray.some((node) => node.key === groupBus)) {
			nodeDataArray.push({
				key: groupBus,
				isGroup: true,
				type: "CANBUS"
			});
		}
	});

	// Create vulnerability entries
	IVN.ECU.forEach((ecu) => {
		ecu.components.forEach((component) => {
			component.services.forEach((service) => {
				if (service.vuls) {
					let vulData = IVN.VUL.find((v) => v.key === service.vuls);
					vulnerability.push({
						key: service.name,
						parent: component.key,
						figure: "None",
						prob: vulData.prob,
						type: "vulnerability"
					});
				}
			});
		});
	});

	return {
		Architecture: {
			nodeDataArray,
			linkDataArray
		},
		Vulnerability: vulnerability
	};
}

// Example usage:
const ivnData = {
	// Your IVN JSON data here
};
const architectureData = convertIVNtoArchitecture(ivnData);
console.log(JSON.stringify(architectureData, null, 2));
