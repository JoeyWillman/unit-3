// Execute setMap function when the window loads
window.onload = setMap;

function setMap() {
    // Function to determine the current dimensions of the window
    function getWindowDimensions() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    // Get initial window dimensions
    var { width, height } = getWindowDimensions();

    // Create new SVG container for the map
    var map = d3.select("#map-container")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // Create Albers equal area conic projection centered on the U.S.
    var projection = d3.geoConicEqualArea()
        .rotate([96, 0])
        .center([0, 37.5])
        .parallels([29.5, 45.5])
        .scale(1900)
        .translate([width / 2, height / 2]);

    // Create a path generator
    var path = d3.geoPath()
        .projection(projection);

    // Create graticule generator
    var graticule = d3.geoGraticule()
        .step([5, 5]); // Place graticule lines every 5 degrees of longitude and latitude

    // Use Promise.all to parallelize asynchronous data loading
    var promises = [
        d3.csv("data/climate-data.csv"),
        d3.json("data/us-states.topojson"),
        d3.json("data/countries.topojson")
    ];

    Promise.all(promises).then(function(data) {
        var csvData = data[0],
            usStates = data[1],
            countries = data[2];

        // Translate TopoJSON to GeoJSON
        var usStatesFeatures = topojson.feature(usStates, usStates.objects.cb_2018_us_state_20m).features;
        var countriesFeatures = topojson.feature(countries, countries.objects.ne_10m_admin_0_countries).features;

        // Filter out Alaska and Hawaii
        usStatesFeatures = usStatesFeatures.filter(function(d) {
            return d.properties.NAME !== "Alaska" && d.properties.NAME !== "Hawaii";
        });

        // Add water background
        map.append("path")
            .datum(graticule.outline()) // Bind graticule background
            .attr("class", "gratBackground") // Assign class for styling
            .attr("d", path); // Project graticule

        // Add graticule lines
        map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines") // Assign class for styling
            .attr("d", path); // Project graticule lines

        // Add countries to the map for context
        map.selectAll(".country")
            .data(countriesFeatures)
            .enter()
            .append("path")
            .attr("class", "country")
            .attr("d", path)
            .style("fill", "#ccc") // Light gray fill for countries
            .style("stroke", "#fff"); // White stroke for country boundaries

        // Add U.S. states to the map
        map.selectAll(".state")
            .data(usStatesFeatures)
            .enter()
            .append("path")
            .attr("class", "state")
            .attr("d", path)
            .style("fill", "#8da0cb") // Blue fill for states
            .style("stroke", "#fff"); // White stroke for state boundaries

        // Additional code to handle climate data visualization can be added here
    }).catch(function(error) {
        console.log("Error loading the data: ", error);
    });

    // Function to resize the map
    function resizeMap() {
        var newDimensions = getWindowDimensions();
        width = newDimensions.width;
        height = newDimensions.height;

        // Update the SVG dimensions
        map.attr("width", width)
           .attr("height", height);

        // Update the projection
        projection.translate([width / 2, height / 2]);

        // Update all paths
        map.selectAll("path")
           .attr("d", path);
    }

    // Add event listener for window resize
    window.addEventListener("resize", resizeMap);
}
