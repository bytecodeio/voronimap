// eslint-disable
import * as d3 from 'd3'
import './voronoimap.scss'
import geoTile from 'd3.geoTile'

import {
    Row,
    Looker,
    // LookerChartUtils,
    VisualizationDefinition
} from '../common/types'

// Global values provided via the API
declare var looker: Looker;
// declare var LookerCharts: LookerChartUtils;

interface VoronoiMap extends VisualizationDefinition {
  svg?: d3.Selection<SVGElement, {}, any, any>,
}

const vis: VoronoiMap = {
    id: 'voronoi',
    label: 'voronoi',
    options: {
        landColor: {
            type: 'string',
            section: 'Style',
            default: '#aaaaaa',
            label: 'Land Color',
            display: 'color'
        },
        pointColor: {
            type: 'string',
            section: 'Style',
            default: '#000000',
            label: 'Point Color',
            display: 'color'
        },
        pointRadius: {
            min: 1,
            max: 20,
            step: 1,
            default: 3,
            type: 'number',
            section: 'Style',
            label: 'Point Radius',
            display: 'range',
        },
        lineColor :{
            type: 'string',
            section: 'Style',
            default: '#FF0000',
            label: 'Line Color',
            display: 'color'
        },
        zoomLevel :{
            default: 0,
            min: 0,
            step: 1,
            max: 20,
            type:'number',
            section: 'Style',
            label: 'Zoom Level',
            display: 'range'
        }
    },
    // Set up the initial state of the visualization
    create: function (element, config) {
        this.svg = d3.select(element).append('svg');

        d3.select(element).append("button")
            .attr("class","zoomIn")
            .html("Zoom In");
        d3.select(element).append("button")
            .attr("class","zoomOut")
            .html("Zoom Out");
        d3.select(element).append("button")
            .attr("class","panUp")
            .html("^");


        if (typeof config.landColor != 'string') {
            config.landColor = this.options.landColor.default;
        }
        if (typeof config.pointColor != 'string') {
            config.pointColor = this.options.pointColor.default;
        }
        if (typeof config.pointRadius != 'number' || config.pointRadius == this.options.pointRadius.max) {
            config.pointRadius = this.options.pointRadius.default;
        }
        if (typeof config.lineColor != 'string') {
            config.lineColor = this.options.lineColor.default;
        }
        if (typeof config.zoomLevel != 'number' || config.zoomLevel == this.options.zoomLevel.max) {
            config.zoomLevel = this.options.zoomLevel.default;
        }
    },
    // Render in response to the data or settings changing
    update: function (data, element, config, queryResponse) {
        const width = element.clientWidth, height = element.clientHeight,prefix = prefixMatch(["webkit", "ms", "Moz", "O"]);
        const dimensions = queryResponse.fields.dimension_like;
        const us = require('./us_geo.json');
        const projection = centerZoom(us);

        if (typeof config.landColor != 'string') {
            config.landColor = this.options.landColor.default;
        }
        if (typeof config.pointColor != 'string') {
            config.pointColor = this.options.pointColor.default;
        }
        if (typeof config.pointRadius != 'number' || config.pointRadius == this.options.pointRadius.max) {
            config.pointRadius = this.options.pointRadius.default;
        }
        if (typeof config.lineColor != 'string') {
            config.lineColor = this.options.lineColor.default;
        }
        if (typeof config.zoomLevel != 'number' || config.zoomLevel == this.options.zoomLevel.max) {
            config.zoomLevel = this.options.zoomLevel.default;
        }

        let i = 0;
        data.forEach((row: Row) => {
            row.taxonomy = {
                value: dimensions.map((dimension) => swapPosition(row[dimension.name].value)),
                arcs:[],
                id: 'lk_line_group_'+i.toString(),
            };
            if (i <= 5) {
                row.taxonomy.arcs = [
                    [-131.402667959,55.549851298],
                ];
            }
            i++;
        });

        this.svg = d3.select(element)
            .select("svg");
        this.svg.remove();

        d3.select(element).selectAll(".zoomIn")
            .on("click",function() { clicked("zoomIn")});
        d3.select(element).selectAll(".zoomOut")
            .on("click",function() {clicked("zoomOut")});
        d3.select(element).selectAll(".panUp")
            .on("click",function() {clicked("panUp")});

        let tile = geoTile()
            .size([width, height]);

        let initialTransform = d3.zoomIdentity
            .translate(0,0)
            .scale(1);

        let svg = d3.select(element)
            .append("svg")
            .attr("height",height)
            .attr("width",width);

        let raster = svg.append("g");

        let zoom = d3.zoom()
            .on("zoom", function() {zoomed();});

        svg.call(zoom.transform, initialTransform);







        function zoomed() {
            console.log('zoomed');
            let transform = d3.event.transform;
            d3.select("#mapLayer").attr("transform",transform);
            d3.select("#pointsLayer").attr("transform",transform);
            // g.style("stroke-width", 1.5 / transform.k + "px");
            // g.attr("transform", transform);

            let tiles = tile
                .scale(transform.k)
                .translate([transform.x,transform.y])
                ();

            projection
                .scale(transform.k / (2 * Math.PI))
                .translate(transform.x, transform.y);

            let image = raster
                .attr("transform", stringify(tiles.scale, tiles.translate))
                .selectAll("image")
                .data(tiles, function(d) { return d; });

            image.exit().remove();

            image.enter().append("image")
                // .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c"][Math.random() * 3 | 0] + ".tile.openstreetmap.org/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
                .attr("xlink:href", function(d) { return "http://" + ["a", "b", "c"][Math.random() * 3 | 0] + ".tile.openstreetmap.org/" + (config.zoomLevel+4) + "/" + (d[0]+2) + "/" + d[1] + ".png"; })
                .attr("x", function(d) { return d[0] * 256; })
                .attr("y", function(d) { return d[1] * 256; })
                .attr("width", 256)
                .attr("height", 256);
        }





        // This function "centers" and "zooms" a map by setting its projection's scale and translate according to its outer boundary
        function centerZoom(data){

            // create a first guess for the projection
            var scale  = 1;
            var offset = [width / 2, height / 2];
            var projection = d3.geoAlbersUsa().scale(scale).translate(offset);

            // get bounds
            var bounds = d3.geoPath().projection(projection).bounds(data);

            // calculate the scale and offset
            var hscale  = scale * width  / (bounds[1][0] - bounds[0][0]);
            var vscale  = scale * height / (bounds[1][1] - bounds[0][1]);
            var scale   = (hscale < vscale) ? hscale : vscale;
            var offset  = [width - (bounds[0][0] + bounds[1][0]) / 2, height - (bounds[0][1] + bounds[1][1]) / 2];

            // new projection
            projection = d3.geoAlbersUsa()
                .scale(scale)
                .translate(offset);

            return projection;

        }

        function clicked(d) {

            let translateX = d3.select(element).select("svg").attr('width'),
                translateY = d3.select(element).select("svg").attr('height');

            if (d == 'zoomIn') {
                config.zoomLevel++;
            }
            if (d == 'zoomOut') {
                config.zoomLevel--;
            }

            translateX = ((translateX / 2) * config.zoomLevel) * -1;
            translateY = ((translateY / 2) * config.zoomLevel) * -1;

            if (d == 'panUp') {
                translateY = translateY - ((translateY / 2) * config.zoomLevel);
            }

            let transform = d3.zoomIdentity
                .translate( translateX, translateY)
                .scale(config.zoomLevel+1);

            svg.transition()
                .duration(750)
                .call(zoom.transform, transform);
        }

        this.svg = d3.select(element).select("svg");

        d3.select(element).select("svg").append("g")
            .attr("id","mapLayer");
        d3.select(element).select("svg").append("g")
            .attr("id","pointsLayer");




        const path = d3.geoPath()
            .projection(projection)
            .pointRadius(5);

        d3.select("#mapLayer").selectAll("path")
            .data(us.features)
            .attr("class", "nation")
            .enter()
            .append("path")
            .attr("fill",(config.landColor || '#AAAAAA'))
            .attr("d",path);

        d3.select("#pointsLayer").selectAll("circle")
            .data(data)
            .enter()
            .append("circle")
            .attr("class","points")
            .attr("cx", function (d) {
                return projection(d.taxonomy.value[0])[0];
            })
            .attr("cy", function (d) {
                return projection(d.taxonomy.value[0])[1];
            })
            .attr("r", function (d) {
                return (config.pointRadius || 2);
            })
            .attr("fill", (config.pointColor || "#000000"))
            .attr("onmouseover",function(d) {
                return "document.querySelectorAll(\"line[line_group='lk_line_group_0']\").forEach(function(l){l.setAttribute(\'style\',\'\')})";
            })
            .attr("onmouseout",function(d) {
                return "document.querySelectorAll(\"line[line_group='lk_line_group_0']\").forEach(function(l){l.setAttribute(\'style\',\'display:none\')})";
            });

        d3.select("#pointsLayer").selectAll("line")
            .data(data)
            .enter()
            .append("line")
            .attr("line_group",function(d) {
                return "lk_line_group_0";
            })
            .attr("x1", function(d) {
                if (d.taxonomy.arcs.length !== 0) {
                    if (projection(d.taxonomy.arcs[0]) !== null) {
                        return projection(d.taxonomy.value[0])[0];
                    }
                }
                return null;
            })
            .attr("y1", function(d) {
                if (d.taxonomy.arcs.length !== 0) {
                    if (projection(d.taxonomy.arcs[0]) !== null) {
                        return projection(d.taxonomy.value[0])[1];
                    }
                }
                return null;
            })
            .attr("x2", function(d) {
                if (d.taxonomy.arcs.length !== 0) {
                    if (projection(d.taxonomy.arcs[0]) !== null) {
                        return projection(d.taxonomy.arcs[0])[0];
                    }
                }
                return null;
            })
            .attr("y2", function(d) {
                if (d.taxonomy.arcs.length !== 0) {
                    if (projection(d.taxonomy.arcs[0]) !== null) {
                        return projection(d.taxonomy.arcs[0])[1];
                    }
                }
                return null;
            })
            .attr("stroke",config.lineColor)
            .attr("style","display:none");
    }
};

function swapPosition(location) {
    return [location[1],location[0]];
}

function matrix3d(scale, translate) {
    let k = scale / 256, r = scale % 1 ? Number : Math.round;
    return "matrix3d(" + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1 ] + ")";
}

function stringify(scale, translate) {
    let k = scale / 256, r = scale % 1 ? Number : Math.round;
    return "translate(" + r(translate[0] * scale) + "," + r(translate[1] * scale) + ") scale(" + k + ")";
}

function prefixMatch(p) {
    let i = -1, n = p.length, s = document.body.style;
    while (++i < n) if (p[i] + "Transform" in s) return "-" + p[i].toLowerCase() + "-";
    return "";
}

looker.plugins.visualizations.add(vis);
