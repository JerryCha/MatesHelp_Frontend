<template>
	<div>
		<div id="map-container">
		</div>
	</div>
</template>

<script>
import MapBox from 'mapbox-gl'
import Directions from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions'
import axios from 'axios'
// import '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css'
import geobox from '@/util/geobox'
import locationIcon from '@/assets/location_user.png'
import poiIcon from '@/assets/location_poi.png'

export default {
	name: 'Map',
	components: {
		MapBox
	},
	props: {
		initCenter: Array,
		mapWidth: {
			type: String,
			default: '100%'
		},
		mapHeight: String
	},
	data () {
		return {
			prevZoomLevel: 13,
			directionControlRef: null,
			mapContainer: {
				width: 0,
				height: 0
			},
			directionVisibility: {
				responsiveVisibility: true
			}
		}
	},
	computed: {
		// Map center coordinate
		center () {
			var coord = this.$store.state.locations.centerLocation
			return coord === null ? coord : this.initCenter
		},
		poiLocation () {
			return this.$store.state.locations.location
		},
		// Point of interests
		poiLocations () {
			return this.$store.state.locations.resultsList
		},
		// Number of points of interests
		poiLocationsCount () {
			return this.$store.state.locations.resultsCount
		},
		isVisible () {
			return this.$store.state.pages.currentTab === 1
		},
		controlVisibility () {
			return this.$store.state.locations.directionVisibility
		},
		responsiveVisibility: function () {
			if (this.mapContainer.width <= 375 ||
						(this.mapContainerWidth < 576 && this.mapContainerWidth < this.mapContainerHeight)) {
				return false
			} else {
				return true
			}
		}
	},
	watch: {
		// Center coordinate watcher
		center: {
			handler: function (newCenter, oldCenter) {
				if (this.poiLocation === null) {
					this.flyToCenter(this.$store.state.locations.centerLocation)
				} else {
					this.flyZoomToCenter(this.$store.state.locations.centerLocation, 16)
				}
			},
			deep: false
		},
		poiLocation (newState, oldState) {
			if (newState === null) {
				this.zoomTo(this.prevZoomLevel)
			}
		},
		// Count of POI change watcher. Once updated, remove the marker and set the new ones
		poiLocationsCount (newState, oldState) {
			this.removeMarker('poiLocations')
			if (newState !== 0) {
				this.setPoiOnMap()
			}
		},
		isVisible (newVal, oldVal) {
			if (newVal) {
				this.resizeMap()
				this.mapContainer.width = this.$el.clientWidth
				this.mapContainer.height = this.$el.clientHeight
			}
		},
		controlVisibility (newVal, oldVal) {
			this.setDirectionControlVisibility()
		},
		responsiveVisibility (newVal, oldVal) {
			this.setDirectionControlVisibility()
		}
	},
	methods: {
		// Mapbox-gl initialization
		initMapBox: function () {
			MapBox.accessToken = 'pk.eyJ1IjoiamVycnljaGEiLCJhIjoiY2sxNXNldmdmMHlibjNjdGM4MnAyZHR4aCJ9.OjElwhEEogXkUfGOgpX3mA'
			const map = new MapBox.Map({
				container: 'map-container',
				trackResize: true,
				style: 'mapbox://styles/jerrycha/ck9i9jbdg02sq1io1c01t4f73',
				center: this.initCenter,
				zoom: 13,
				pitch: 45
			})
			this.map = map
			this.$store.dispatch('locations/setMapRef', map)
			this.map.on('load', () => {
				// In case where the center location is null, updating with initial center.
				if (this.$store.state.locations.centerLocation === null) {
					this.updateCenterCoord()
				} else {
					// Otherwise, jumping to the center coordinate.
					this.map.jumpTo({
						center: this.$store.state.locations.centerLocation
					})
				}
				this.updateBoxBound()
			})

			var directionControl = new Directions({
				accessToken: MapBox.accessToken,
				interactive: false,
				unit: 'metric'
			})
			this.map.addControl(directionControl, 'top-left')
			// Adding zoom control
			this.map.addControl(new MapBox.NavigationControl())
			// Add method to hide and show the widget
			directionControl.toggleVisibility = function () {
				this.container.hidden = !this.container.hidden
			}
			directionControl.show = function () {
				var mapboxWidth = this._map.boxZoom._container.clientWidth
				if (mapboxWidth > 375) {
					// this refers to direction control
					this.container.hidden = false
				}
			}
			directionControl.hide = function () {
				this.container.hidden = true
			}
			directionControl.setVisibility = function (v) {
				this.container.hidden = !v
			}
			// Hide the direction control on load.
			directionControl.hide()
			this.directionControlRef = directionControl
			// Push direction control to the map instance.
			this.map.controlWidgets = { topLeft: directionControl }
			// Once the viewing area changed, updating the bounding box.
			this.map.on('moveend', () => {
				this.updateBoxBound()
			})
			// Keeping the zoom level before zomming, so that it can changed back while exiting from detailed view.
			this.map.on('zoomstart', () => {
				this.prevZoomLevel = this.map.getZoom()
			})
		},
		reverseGeocoding: async function (coord) {
			const api = 'https://api.mapbox.com/geocoding/v5/mapbox.places/'
			const type = 'locality'
			var query = api + `${coord[0]},${coord[1]}.json/?` + `type=${type}&access_token=${this.mapbox.accessToken}`
			var addr = null
			await axios.get(query)
				.then(res => {
					addr = res.data.features[0].place_name
				})
				.catch(e => { window.console.error(e) })
			return addr
		},
		zoomTo (newZoomLevel) {
			this.map.zoomTo(newZoomLevel, {
				duration: 1000
			})
		},
		resizeMap: function () {
			this.map.resize()
		},
		flyToCenter: function (destCoord) {
			this.map.flyTo({
				center: destCoord,
				essential: true
			})
		},
		flyZoomToCenter: function (destCoord, zoom) {
			// Fly to the new coordinate
			this.map.flyTo({
				center: destCoord,
				zoom: zoom,
				essential: true
			})
		},
		// Set user's current location marker
		setUserLocation: function () {
			// TODO: optimize the replacement process in next iteration
			// Remove the marker if already has one
			this.removeMarker('userLocation')
			// Adding new makrer
			this.map.loadImage(locationIcon, (err, img) => {
				if (err) throw err
				this.map.addImage('userLocation', img)
				this.map.addSource('userLocation', geobox.buildMapboxSource([this.$store.state.locations.currentLocation]))
				this.map.addLayer({
					'id': 'userLocation',
					'type': 'symbol',
					'source': 'userLocation',
					'layout': {
						'icon-image': 'userLocation',
						'icon-allow-overlap': true,
						'icon-size': 0.25
					}
				})
			})
		},
		updateBoxBound: function () {
			// Get bound
			var newBound = {
				'ne': this.map.getBounds().getNorthEast().toArray(),
				'sw': this.map.getBounds().getSouthWest().toArray()
			}
			this.$store.dispatch('locations/updateBoxBound', newBound)
			// this.$store.dispatch('locations/getLocations',newBound)
			// this.$store.dispatch('locations/getAllLocations')
			// this.setPoiOnMap()
		},
		removeMarker: function (name) {
			return new Promise((resolve, reject) => {
				if (this.map.hasImage(name)) { this.map.removeImage(name) }
				if (this.map.getLayer(name)) { this.map.removeLayer(name) }
				if (this.map.getLayer(name + '-labels')) { this.map.removeLayer(name + '-labels') }
				if (this.map.getSource(name)) { this.map.removeSource(name) }
				resolve()
			})
		},
		// Update center coordination
		updateCenterCoord: function () {
			// Get center coord of current view, and update to store
			this.$store.dispatch('locations/setCenterLocation', this.map.getCenter().toArray())
		},
		// Set POI marker on map
		setPoiOnMap: function () {
			// Extracting the locations from shown results list
			var poiLocations =
				this.$store.state.locations.resultsList
					.map(loc => {
						return {
							name: loc.name,
							coord: loc.location.substring(loc.location.indexOf('(') + 1, loc.location.indexOf(')'))
								.split(' ')
								.map(p => Number(p)),
							id: loc.id
						}
					})
			// TODO: optimize the replacement process in next iteration
			this.removeMarker('poiLocations')
				.then(() => {
					this.map.loadImage(poiIcon, (err, img) => {
						if (err) throw err
						this.map.addImage('poiLocations', img)
						this.map.addSource('poiLocations', geobox.buildMapboxSource(poiLocations))
						this.map.addLayer({
							'id': 'poiLocations',
							'type': 'symbol',
							'source': 'poiLocations',
							'layout': {
								'icon-image': 'poiLocations',
								'icon-allow-overlap': true,	// Allow overlapping, avoid marker hidden at different zoom levels
								'icon-size': 0.5
							}
						})
						this.map.addLayer({
							'id': 'poiLocations-labels',
							'type': 'symbol',
							'source': 'poiLocations',
							'minzoom': 12,
							'layout': {
								'text-field': ['get', 'description'],
								'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
								'text-justify': 'auto',
								'text-radial-offset': 0.5
							}
						})
					})
					// Making the markers clickable
					this.map.on('click', 'poiLocations', (e) => {
						var coordinate = e.features[0].geometry.coordinates.slice()
						var description = e.features[0].properties.description
						var id = String(e.features[0].properties.id)
						new MapBox.Popup().setLngLat(coordinate).setHTML(`<p>${description}</p><br><a href='#/seek-help/${this.$store.state.pages.pageData.slug}/detail/${id}'>Detail</a>`).addTo(this.map)
					})
					// Change the cursor to a pointer when the mouse is over the place layer.
					this.map.on('mouseenter', 'poiLocations', (e) => {
						var id = e.features[0].properties.id
						this.$store.dispatch('locations/updateOnHoverLocationId', id)
						this.map.getCanvas().style.cursor = 'pointer'
					})
					// Change the cursor back to normal style while it leaves
					this.map.on('mouseleave', 'poiLocations', () => {
						this.$store.dispatch('locations/updateOnHoverLocationId', -1)
						this.map.getCanvas().style.cursor = ''
					})
				})
		},
		setDirectionControlVisibility: function () {
			this.directionControlRef.setVisibility(this.controlVisibility && this.responsiveVisibility)
		}
	},
	mounted () {
		this.initMapBox()
		this.mapContainer.width = this.$el.clientWidth
		this.mapContainer.height = this.$el.clientHeight
		window.addEventListener('resize', () => {
			this.mapContainer.width = this.$el.clientWidth
			this.mapContainer.height = this.$el.clientHeight
		})
	},
	updated () {
	}
}
</script>

<style scoped>
@import url(https://api.mapbox.com/mapbox-gl-js/v1.8.1/mapbox-gl.css);
@import url(https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-directions/v4.0.2/mapbox-gl-directions.css);
#map-container {
	height: 100%;
	width: 100%;
}
#mapboxgl-directions-origin-input,#mapbox-directions-destination-input input {
	width: auto;
}
.mapboxgl-ctrl-top-left {
	visibility: visible !important;
}
@media only screen and (max-width: 575px) {
	.mapboxgl-ctrl-top-left {
		visibility: hidden !important;
	}
}
</style>
