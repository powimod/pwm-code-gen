/* pwm-code-generator - Powimod Code Generator
 * Copyright (C) 2023 Dominique Parisot
 *
 * main.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
'use strict';

const {Liquid} = require('liquidjs');
const yaml = require('js-yaml');
const fs = require('fs');
const assert = require('node:assert/strict');


function loadPropertyName(property, name) {
	if (property.name !== null) // FIXME add property number in error message
		throw new Error(`Name of property of object <${property.object.name}> already defined`);
	name = name.trim();
	if (name.length === 0) // FIXME add property number in error message
		throw new Error(`Property name of object <${property.object.name}> is empty`);
	property.name = name;
}

function loadPropertyType(object, property, propType) {
	// FIXME in exception message, object.name can be null
	// if <type> is defined before <name> in YAML
	if (property.type !== null) // FIXME add property number in error message
		throw new Error(`Type of property <${property.name}> of object <${object.name}> already defined`);
	propType = propType.trim();
	if (propType.length === 0) // FIXME add property number in error message
		throw new Error(`Property name of object <${object.name} is empty`);
	property.type = propType;
}

function loadPropertyMandatory(object, property, propMandatory) {
	if (property.mandatory !== null) // FIXME add property number in error message
		throw new Error(`Attribute <mandatory> of property <${object.name}.${property.name}> is already defined`);
	if (propMandatory !== true && propMandatory !== false) // FIXME add property number in error message
		throw new Error(`Property <mandatory> of object <${object.name} is not a boolean`);
	property.mandatory = propMandatory;
}


function loadObjectPropertyList(object, propertiesDefinition) {
	if (propertiesDefinition.length === undefined)
		throw new Error(`Property list of object <${object.name}> is not an array`);

	let iProperty = 0;
	for (let propertyDefinition of propertiesDefinition) {
		iProperty++;
		let property = {
			name : null,
			type: null,
			mandatory: null,
			object: object
		};

		for (let attrName in propertyDefinition) {
			let attrValue = propertyDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadPropertyName(property, attrValue);
					break;
				case 'type':
					loadPropertyType(object, property, attrValue);
					break;
				case 'mandatory':
					loadPropertyMandatory(object, property, attrValue);
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}> in  property ${property.name} of object ${object.name}`);
					break;
			}
		}
		if (property.name === null)
			throw new Error(`Name of property n°${iProperty} of object ${object.name} is not defined`);
		if (property.type === null)
			throw new Error(`Type of property n°${iProperty} of object ${object.name} is not defined`);
		if (property.mandatory === null)
			property.mandatory = true;
		object.properties.push(property);
	}
}

function loadObjectAttributeName(attribute, name)
{
	if (attribute.name !== null) 
		throw new Error(`Name of attribute of object <${attribute.object.name}> already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Property name of object <${attribute.object.name}> is empty`);
	attribute.name = name;
}

function loadObjectAttributeValue(attribute, value)
{
	if (attribute.value !== null) 
		throw new Error(`Value of attribute <${attribute.name}> of object <${attribute.object.name}> already defined`);
	value = value.trim();
	if (value.length === 0)
		throw new Error(`Value of attribute <${attribute.name}> of object <${attribute.object.name}> is empty`);
	attribute.value = value;
}


function loadObjectAttributeList(object, attributesDefinition) {
	if (attributesDefinition.length === undefined)
		throw new Error(`Attribute list of object <${object.name}> is not an array`);

	let iAttribute = 0;
	for (let attributeDefinition of attributesDefinition) {
		iAttribute++;
		let attribute = {
			name : null,
			value: null,
			object: object
		};

		for (let attrName in attributeDefinition) {
			let attrValue = attributeDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadObjectAttributeName(attribute, attrValue);
					break;
				case 'value':
					loadObjectAttributeValue(attribute, attrValue);
					break;
				default:
					// FIXME double use of attribute in the same error message
					throw new Error(`Unknown attribut <${attrName}> in attribute <${attribute.name}> of object <${object.name}>`);
					break;
			}
		}
		if (attribute.name === null)
			throw new Error(`Name of attribute n°${iAttribute} of object <${object.name}> is not defined`);
		if (attribute.value === null)
			throw new Error(`Value of attribute <${attribute.name}> of object <${object.name}> is not defined`);
		object.attributes.push(attribute);
	}
}


function loadObjectName(object, name) {
	if (object.name !== null)
		throw new Error(`Object name already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Object name is empty`);
	object.name = name;
}

function loadProjectObjectList(project, objectsDefinition) {
	if (objectsDefinition.length === undefined)
		throw new Error(`Object list is not an array`);
	if (project.objects.length > 0)
		throw new Error(`Objects list already loaded`);

	let iObject = 0;
	for (let objectDefinition of objectsDefinition) {
		iObject++;
		let object = {
			name: null,
			properties: [],
			links : [],
			attributes: [],
			project: project
		};

		for (let attrName in objectDefinition) {
			let attrValue = objectDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadObjectName(object, attrValue);
					break;
				case 'properties':
					loadObjectPropertyList(object, attrValue);
					break;
				case 'attributes':
					loadObjectAttributeList(object, attrValue);
					break;
				case 'links':
					// links loading is done in second step
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}> in object <${object.name}>`);
					break;
			}
		}
		if (object.name === null)
			throw new Error(`Name of object n°${iObject} is not defined`);
		if (object.properties.length === 0)
			throw new Error(`Property list of object <${object.name}> is empty`);
		// attribute list can be empty
		project.objects.push(object);
	}
}

function loadProjectName(project, name) {
	if (project.name !== null)
		throw new Error(`Project name already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Project name is empty`);
	project.name = name;
}

function loadFileScope(file, scope) {
	if (file.scope !== null)
		throw new Error(`File scope already defined`);
	scope = scope.trim();
	if (scope.length === 0)
		throw new Error(`File scope is empty`);
	const scopeValidList = [ 'project', 'object' ];
	if (! scope in scopeValidList)
		throw new Error(`Invalid file scope <${scope}> (should be ${scopeValidList.join('/')})`);
	file.scope = scope;
}

function loadFileInput(file, inputFile) {
	if (file.input !== null)
		throw new Error(`File input already defined`);
	inputFile = inputFile.trim();
	if (inputFile.length === 0)
		throw new Error(`File inputFile is empty`);
	file.input = inputFile;
}

function loadFileOutput(file, outputFile) {
	if (file.output !== null)
		throw new Error(`File output already defined`);
	outputFile = outputFile.trim();
	if (outputFile.length === 0)
		throw new Error(`File outputFile is empty`);
	file.output = outputFile;
}

function loadProjectFileList(project, filesDefinition) {
	assert.ok(project !== undefined);
	assert.ok(filesDefinition !== undefined);
	if (filesDefinition.length === undefined)
		throw new Error(`File list is not an array`);
	if (project.files.length > 0)
		throw new Error(`Files list already loaded`);

	let iFile = 0;
	for (let fileDefinition of filesDefinition) {
		iFile++;
		let file = {
			scope: null,
			input: null,
			output: null,
			project: project
		};

		for (let attrName in fileDefinition) {
			let attrValue = fileDefinition[attrName];
			switch (attrName) {
				case 'scope':
					loadFileScope(file, attrValue);
					break;
				case 'input':
					loadFileInput(file, attrValue);
					break;
				case 'output':
					loadFileOutput(file, attrValue);
					break;
				default:
					throw new Error(`Unknown attribut <${attrName}>`);
					break;
			}
		}
		if (file.scope === null)
			throw new Error(`Scope of file n°${iFile} is not defined`);
		if (file.input === null)
			throw new Error(`Input of file n°${iFile} is not defined`);
		if (file.output === null)
			throw new Error(`Output of file n°${iFile} is not defined`);
		project.files.push(file);
	}
}

function loadProjectAttributeName(attribute, name)
{
	if (attribute.name !== null) 
		throw new Error(`Name of attribute of project <${attribute.project.name}> already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Property name of project <${attribute.project.name}> is empty`);
	attribute.name = name;
}

function loadProjectAttributeValue(attribute, value)
{
	if (attribute.value !== null) 
		throw new Error(`Value of attribute <${attribute.name}> of project <${attribute.project.name}> already defined`);
	value = value.trim();
	if (value.length === 0)
		throw new Error(`Value of attribute <${attribute.name}> of project <${attribute.project.name}> is empty`);
	attribute.value = value;
}


function loadProjectAttributeList(project, attributesDefinition) {
	if (attributesDefinition.length === undefined)
		throw new Error(`Attribute list of project <${project.name}> is not an array`);

	let iAttribute = 0;
	for (let attributeDefinition of attributesDefinition) {
		iAttribute++;
		let attribute = {
			name : null,
			value: null,
			project: project
		};

		for (let attrName in attributeDefinition) {
			let attrValue = attributeDefinition[attrName];
			switch (attrName) {
				case 'name':
					loadProjectAttributeName(attribute, attrValue);
					break;
				case 'value':
					loadProjectAttributeValue(attribute, attrValue);
					break;
				default:
					// FIXME double use of attribute in the same error message
					throw new Error(`Unknown attribut <${attrName}> in attribute <${attribute.name}> of project <${project.name}>`);
					break;
			}
		}
		if (attribute.name === null)
			throw new Error(`Name of attribute n°${iAttribute} of project <${project.name}> is not defined`);
		if (attribute.value === null)
			throw new Error(`Value of attribute <${attribute.name}> of project <${project.name}> is not defined`);
		project.attributes.push(attribute);
	}
}


function loadProjectStep1(project, projectDefinition, verbose)
{
	for (let attrName in projectDefinition) {
		let attrValue = projectDefinition[attrName];
		switch (attrName) {
			case 'name':
				loadProjectName(project, attrValue);
				break;
			case 'attributes':
				loadProjectAttributeList(project, attrValue);
				break;
			case 'objects':
				loadProjectObjectList(project, attrValue);
				break;
			case 'files':
				loadProjectFileList(project, attrValue);
				break;
			default:
				throw new Error(`Unknown attribut <${attrName}>`);
				break;
		}
	}
	if (project.name === null)
		throw new Error(`Project name is not defined`);
	if (project.objects.length === 0)
		throw new Error(`Project object list is empty`);

}

function loadLinkName(objectLink, name) {
	if (objectLink.name !== null)
		throw new Error(`Object link name already defined`);
	name = name.trim();
	if (name.length === 0)
		throw new Error(`Object link name is empty`);
	objectLink.name = name;
}

function loadLinkMandatory(objectLink, value) {
	if (objectLink.mandatory !== null)
		throw new Error(`Object link mandatory property already defined`);
	if (value !== true && value !== false)
		throw new Error(`Property <mandatory> of link <${link.name} is not a boolean`);
	objectLink.mandatory = value;
}

function loadLinkTarget(objectLink, targetObjectName) {
	if (objectLink.target !== null)
		throw new Error(`Object link target already defined`);
	if (targetObjectName.trim === undefined)
		throw new Error('Link target is not a string');
	targetObjectName = targetObjectName.trim();


	assert.ok(objectLink.object !== undefined);
	assert.ok(objectLink.object.project !== undefined);
	let project = objectLink.object.project;
	
	let targetObject = project.objects.find( obj => obj.name === targetObjectName );
	if (targetObject === undefined)
		throw new Error(`Object link target <${targetObjectName}> does not exist`);

	objectLink.target = targetObject;
}



function loadLink(projectObject, linkDef, verbose) {
	let objectLink = {
		name: null,
		target: null,
		mandatory: null,
		object: projectObject
	}
	for (let attrName in linkDef) {
		let attrValue = linkDef[attrName];
		switch (attrName) {
			case 'name':
				loadLinkName(objectLink, attrValue);
				break;
			case 'target':
				loadLinkTarget(objectLink, attrValue);
				break;
			case 'mandatory':
				loadLinkMandatory(objectLink, attrValue);
				break;
			default:
				throw new Error(`Unknown attribut <${attrName} in link definition>`);
				break;
		}
	}
	if (objectLink.name === null)
		throw new Error(`Link target is not defined`);
	if (objectLink.target=== null)
		throw new Error(`Target of link <${objectLink.name}> is not defined`);
	if (objectLink.mandatory === null)
		objectLink.mandatory = true;
	projectObject.links.push(objectLink);
}

function loadProjectStep2(project, projectDefinition, verbose)
{
	for (let objectDef of projectDefinition.objects) {
		let projectObject = project.objects.find( (obj) => obj.name === objectDef.name );
		assert.ok(projectObject !== undefined);

		let linkListDef = objectDef.links;
		if (linkListDef === undefined)
			continue;
		if (linkListDef.length === undefined)
			throw new Error(`Link list of object ${object.name} is not an array`);

		for (let linkDef of linkListDef)
			loadLink(projectObject, linkDef, verbose);
	}
}


function dumpProject(project)
{
	function tab(n) {
		return ' '.repeat(n);
	}
	console.log(`\nProject <${project.name}> :`);
	console.log(`Attributes : x${project.attributes.length}`);
	for (let attribute of project.attributes ) 
		console.log(`  - Attribut <${attribute.name}> = <${attribute.value}>`);
	console.log(`Objects : x${project.objects.length}`);
	for (let projectObject of project.objects) {
		console.log(`${tab(2)}- Object <${projectObject.name}> :`);
		console.log(`${tab(2)}  Attributes : x${projectObject.attributes.length}`);
		for (let attribute of projectObject.attributes ) 
			console.log(`${tab(6)}- Attribut <${attribute.name}> = <${attribute.value}>`);
		console.log(`${tab(2)}  Properties : x${projectObject.properties.length}`);
		for (let property of projectObject.properties) 
			console.log(`${tab(6)}- Property <${property.name}> (type:${property.type}, mandatory:${property.mandatory})`);
		console.log(`${tab(2)}  Links : x${projectObject.links.length}`);
		for (let objectLink of projectObject.links )
			console.log(`${tab(6)}- Link <${objectLink.name}> (target:${objectLink.target.name}, mandatory:${objectLink.mandatory})`);
	}
	console.log(`Files : x${project.files.length}`);
	let iFile = 1;
	for (let file of project.files) {
		console.log(`${tab(2)}- File n°${iFile++} (scope <${file.scope}>)`);
		console.log(`${tab(2)}   - Input : <${file.input}>)`);
		console.log(`${tab(2)}   - Output : <${file.output}>)`);
	}
	console.log('');
}


function loadProject(projectDefinition, verbose)
{
	let project = {
		name : null,
		attributes: [],
		objects : [],
		files : [],
	};
	loadProjectStep1(project, projectDefinition, verbose);
	loadProjectStep2(project, projectDefinition, verbose);
	if (verbose)
		dumpProject(project);
	return project;
}



async function generateFiles(project, verbose) {
	const liquid = new Liquid();
	// generate files
	if (verbose)
		console.log("File generation:");
	let i = 0;
	for (let projectFile of project.files){
		i++;
		if (verbose) {
			console.log(`- File n°${i} (scope:${projectFile.scope})`);
			console.log(`    -> input:${projectFile.input})`);
			console.log(`    -> ouptut:${projectFile.output})`);
		}
		if (projectFile.scope === 'project') {
			let outputFile = await liquid.parseAndRender(projectFile.output, { project: project } );
			console.log(`* Generating project file ${outputFile}...`);
			let fileContent = await liquid.renderFile(projectFile.input, {project: project});
			fs.writeFileSync(outputFile, fileContent);
			continue;
		}
		for (let projectObject of project.objects){
			if (projectFile.scope === 'object') {
				let outputFile = await liquid.parseAndRender(projectFile.output, { object: projectObject, project: project } );
				console.log(`* Generating object file ${outputFile}...`);
				let fileContent = await liquid.renderFile(projectFile.input, {object: projectObject, project: project});
				fs.writeFileSync(outputFile, fileContent);
				continue;
			}
		}
	}
}

async function main() {
	const { program } = require('commander');
	program.option('--verbose');
	program.parse();
	const options = program.opts();
	const verbose = options.verbose ? 1 : undefined;

	let projectFile = program.args[0];
	if (projectFile === undefined) {
		console.error(`Error : project file argument required!`);
		process.exit(1);
	}

	// read project file
	let project = null;
	try {
  		project = yaml.load(fs.readFileSync(projectFile, 'utf8'));
	}
	catch (error) {
		console.error(`Error : Can't read project file <${error}> !`);
		process.exit(1);
	}

	// control project validity
	try {
		loadProject(project, verbose);
	}
	catch (error) {
		console.error(`Error : ${error.message} in project file <${projectFile}> !`);
		process.exit(1);
	}

	try {
		await generateFiles(project, verbose)
	}
	catch (error) {
		console.error(`Error : ${error.message} in project file <${projectFile}> !`);
		process.exit(1);
	}

	console.log('End.');
}

main();
