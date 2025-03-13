// Execute script when window is loaded
window.onload = function(){

    // SVG dimension variables
    var w = 900, h = 500;

    // Container block - appending SVG to the body
    var container = d3.select("body") // Select the <body> element
        .append("svg") // Append a new <svg> element
        .attr("width", w) // Set SVG width
        .attr("height", h) // Set SVG height
        .attr("class", "container") // Assign class for styling
        .style("background-color", "rgba(0,0,0,0.2)"); // Background color

    // Inner rectangle block (white rectangle in the middle)
    var innerRect = container.append("rect") // Append a rectangle
        .attr("width", 800) // Width of rectangle
        .attr("height", 400) // Height of rectangle
        .attr("x", 50) // Position from left
        .attr("y", 50) // Position from top
        .attr("class", "innerRect") // Assign class for styling
        .style("fill", "#FFFFFF"); // White background

    // City population data array
    var cityPop = [
        { city: 'Madison', population: 233209 },
        { city: 'Milwaukee', population: 594833 },
        { city: 'Green Bay', population: 104057 },
        { city: 'Superior', population: 27244 }
    ];

    // Find min and max population values
    var minPop = d3.min(cityPop, function(d) { return d.population; });
    var maxPop = d3.max(cityPop, function(d) { return d.population; });

    // X scale for positioning circles
    var x = d3.scaleLinear()
        .range([90, 750]) // Adjusted max range for labels
        .domain([0, cityPop.length - 1]); // Index values

    // Y scale for vertical positioning
    var y = d3.scaleLinear()
        .range([450, 50]) // Flipped so larger values are higher
        .domain([0, 700000]); // Extended for better axis coverage

    // Color scale for fill colors
    var color = d3.scaleLinear()
        .range(["#FDBE85", "#D94701"])
        .domain([minPop, maxPop]);

    // Circles block - creating circles for each city
    var circles = container.selectAll(".circles") // Create an empty selection
        .data(cityPop) // Bind data to selection
        .enter() // Create placeholder elements
        .append("circle") // Append a circle for each data point
        .attr("class", "circles") // Assign class for styling
        .attr("id", function(d){ return d.city; }) // Assign city name as ID
        .attr("r", function(d){ return Math.sqrt(d.population * 0.01 / Math.PI); }) // Scale radius
        .attr("cx", function(d, i){ return x(i); }) // Use scale for x position
        .attr("cy", function(d){ return y(d.population); }) // Use scale for y position
        .style("fill", function(d){ return color(d.population); }) // Color based on population
        .style("stroke", "#000") // Black border
        .style("stroke-width", "2px");

    // Y-axis generator
    var yAxis = d3.axisLeft(y);

    // Append Y-axis to container
    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(50, 0)") // Move into position
        .call(yAxis);

   // Chart title block
var title = container.append("text")
.attr("class", "title")
.attr("text-anchor", "middle")
.attr("x", w / 2) // Center horizontally
.attr("y", 40) // Adjusted Y position for better spacing
.style("font-size", "28px") // Increased font size
.style("font-weight", "bold") // Make text bold
.text("City Populations");

    // Create labels for each city
    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){ return y(d.population) + 5; }); // Center vertically

    // First line of label (city name)
    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d, i){ return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; })
        .text(function(d){ return d.city; });

    // Format population numbers with commas
    var format = d3.format(",");

    // Second line of label (population)
    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d, i){ return x(i) + Math.sqrt(d.population * 0.01 / Math.PI) + 5; })
        .attr("dy", "15") // Offset second line down
        .text(function(d){ return "Pop. " + format(d.population); });

};
