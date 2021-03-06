import axios from 'axios'
import API from '@/api/api'
import queryHelper from '@/util/query'

const state = {
	navbar: null,
	mapRef: null,
	directionVisibility: false,
	resultsList: [],	// results list for showing
	resultsType: [], // type of fetched location
	resultsCount: 0,	// count of showing results list
	filterTypes: [],	// Types of location to show on map
	allTypes: [], // All types of location
	fetchedLocations: [],	// list to store all the locations within a range
	location: null,	// location for detailed view
	locationPopup: null,
	centerLocation: null,	// map center coordinate
	currentLocation: null,	// user location coordinate
	boxBound: {},	// southern-west, northern-east
	queryParams: {},	// parameters for query
	searchText: null,
	onHoverLocationId: -1	// Location Point of interest which is currently hovering by cursor
}

const getters = {
	getLocationFromRepo (state, id) {
		return state.locations.filter(loc => loc.id === id)
	}
}

const mutations = {
	/**
	 * Reference to navbar
	 * @param {*} state
	 * @param {*} navbar
	 */
	setNavbar (state, navbar) {
		state.navbar = navbar
	},
	/**
	 * Referencce to mapbox instance
	 * @param {*} state state
	 * @param {*} mapbox mapbox instance
	 */
	setMapRef (state, mapbox) {
		state.mapRef = mapbox
	},
	setDirectionVisibility (state, v) {
		state.directionVisibility = v
	},
	/**
	 * resultsList mutator
	 * @param {*} state state reference
	 * @param {Array} locations data source of new results list
	 */
	setResultsList (state, locations) {
		state.resultsList = locations
	},
	/**
	 * Set resultsType
	 * @param {*} state state
	 * @param {*} types types
	 */
	setResultsType (state, types) {
		state.resultsType = types
	},
	/**
	 * resultsCount mutator.
	 * Count will be set to -1 if searching. Otherwise set to the length of resultsList
	 * @param {*} state state reference
	 * @param {*} searchFlag searching status indicator. true if fetching result from backend
	 */
	setResultsCount (state, searchFlag) {
		if (searchFlag) {
			state.resultsCount = -1
		} else {
			state.resultsCount = state.resultsList !== null ? state.resultsList.length : 0
		}
	},
	/**
	 * Set filterTypes
	 * @param {*} state state
	 * @param {*} types types
	 */
	setFilterTypes (state, types) {
		state.filterTypes = types
	},
	/**
   * Set al the types of location
   * @param state
   * @param types
   */
	setAllTypes (state, types) {
		state.allTypes = types
	},
	/**
	 * fetchedLocations mutator.
	 * This is the source of resultsList.
	 * @param {*} state state reference
	 * @param {Array} locations fetched data to set
	 */
	setFetchedLocations (state, locations) {
		state.fetchedLocations = locations
	},
	/**
	 * location mutator.
	 * @param {*} state state reference
	 * @param {Object} location current viewed location.
	 */
	setLocation (state, location) {
		state.location = location
	},
	/**
	 * Set current location marker popup
	 * @param {*} state state
	 * @param {*} popup popup marker
	 */
	setLocationPopup (state, popup) {
		state.popup = popup
	},
	/**
	 * queryParams mutator.
	 * @param {*} state state reference
	 * @param {Object} form form to set as query parameters
	 */
	setQueryParams (state, form) {
		state.queryParams = form
	},
	/**
	 * centerLocation mutator
	 * @param {*} state state reference
	 * @param {Array} coord new center coordinate on map. (format: [lng, lat])
	 */
	setCenterLocation (state, coord) {
		state.centerLocation = coord
	},
	/**
	 * currentLocation mutator
	 * @param {*} state state reference
	 * @param {*} coord new user location coordinate. (format: [lng, lat])
	 */
	setCurrentLocation (state, coord) {
		state.currentLocation = coord
	},
	/**
	 * Set bound of viewing area
	 * @param {*} state state
	 * @param {*} bound bound coordinates
	 */
	setBoxBound (state, bound) {
		state.boxBound = bound
	},
	/**
	 * Set search text
	 * @param {*} state state
	 * @param {*} text text
	 */
	setSearchText (state, text) {
		state.searchText = text
		console.log(state.searchText)
	},
	/**
	 * Set onHoverLocationId. The ID of location of which marker is hovering
	 * @param {*} state state
	 * @param {*} id id
	 */
	setOnHoverLocationId (state, id) {
		state.onHoverLocationId = id
	}
}

const actions = {
	/**
	 * Set navbar reference
	 * @param {*} context context
	 * @param {*} navbar narbar reference
	 */
	setNavbar (context, navbar) {
		context.commit('setNavbar', navbar)
	},
	/**
	 * Set mapbox instance reference
	 * @param {*} context context
	 * @param {*} mapbox mapbox instance reference
	 */
	setMapRef (context, mapbox) {
		context.commit('setMapRef', mapbox)
	},
	setDirectionVisibility (context, v) {
		context.commit('setDirectionVisibility', v)
	},
	/**
	 * Set result of locations from external sources
	 * @param {*} context context
	 * @param {*} locations locations list
	 */
	setFetchedLocations (context, locations) {
		context.commit('setFetchedLocations', locations)
		context.commit('setResultsList', locations)
		context.commit('setResultsCount')
	},
	/**
	 * Set allTypes with external source
	 * @param {*} context context
	 * @param {*} types types
	 */
	setAllTypes (context, types) {
		var tempArray = []
		var valueArray = []
		axios.get(API.TYPES.TYPE_API())
			.then((response) => {
				for (var key in response.data) {
					var option = response.data[key]
					if (types.includes(option.id)) {
						var filter = {
							value: option.id, text: option.name
						}
						tempArray.push(filter)
						valueArray.push(filter.value)
					}
				}
				context.commit('setAllTypes', tempArray)
			})
	},
	/**
	 * Set types of result of locations
	 * @param {*} context context
	 * @param {*} types types
	 */
	setResultsType (context, types) {
		context.commit('setResultsType', types)
	},
	/**
	 * Set filter type
	 * @param {*} context context
	 * @param {*} types types
	 */
	setFilterTypes (context, types) {
		context.commit('setFilterTypes', types)
	},
	/**
	 * Fetching locations as per query conditions.
	 * @param {*} context context
	 */
	searchLocations (context) {
		return axios.get(API.LOCATION.SEARCH_LOCATIONS() + '?' + queryHelper.locationQueryBuilder(context.state.queryParams))
			.then(res => {
				var results = res.data
				var types = []
				results.forEach(r => {
					var temp = r.type.split('/')
					var id = Number(temp[temp.length - 2])
					if (!types.includes(id)) {
						types.push(id)
					}
				})
				// Once data fetched successfully, setting to both fetchedLocations & resultsList.
				context.commit('setFetchedLocations', results)
				context.commit('setResultsList', results)
				context.commit('setResultsCount')
				context.commit('setResultsType', types)
			})
			.catch(e => { window.console.error(e) })
	},
	/**
	 * Fetching locations within a specific area
	 * @param {*} context context
	 * @param {*} bounds bounds' coordinate
	 */
	getLocations (context, bounds) {
		// Build the search query
		var query = 'ne=' + bounds.ne[0] + ',' + bounds.ne[1] + '&sw=' + bounds.sw[0] + ',' + bounds.sw[1]
		return axios.get(API.LOCATION.SEARCH_LOCATIONS() + '?' + query)
			.then(res => {
				var results = res.data
				var types = []	// Initialize an empty list to store the type id
				//	Process the id field.
				results.forEach(r => {
					var temp = r.type.split('/')
					var id = Number(temp[temp.length - 2])
					if (!types.includes(id)) {
						types.push(id)
					}
				})
				// Once data fetched successfully, setting to both fetchedLocations & resultsList.
				context.commit('setFetchedLocations', results)
				context.commit('setResultsList', results)
				context.commit('setResultsCount')
				context.commit('setResultsType', types)
			})
			.catch(e => { window.console.error(e) })
	},
	/**
	 * Fetching all locations
	 * @param {*} context context
	 */
	getAllLocations (context) {
		return axios.get(API.LOCATION.SEARCH_LOCATIONS())
			.then(res => {
				var results = res.data
				var types = []	// Initialize an empty list to store the type id
				//	Process the id field.
				results.forEach(r => {
					var temp = r.type.split('/')
					var id = Number(temp[temp.length - 2])
					if (!types.includes(id)) {
						types.push(id)
					}
				})
				// window.console.log(`resultsType: ${types}`)
				// Once data fetched successfully, setting to both fetchedLocations & resultsList.
				context.commit('setFetchedLocations', results)
				context.commit('setResultsList', results)
				context.commit('setResultsCount')
				context.commit('setResultsType', types)
			})
	},
	/**
	 * fetching all types from server
	 * @param {*} context context
	 */
	fetchAllTypes (context) {
		// Get location type from backend
		axios.get(API.TYPES.TYPE_API()).then((response) => {
			var tempArray = []
			var valueArray = []
			for (var key in response.data) {
				var option = response.data[key]
				var filter = {
					value: option.id, text: option.name
				}
				tempArray.push(filter)
				valueArray.push(filter.value)
			}
			context.commit('setFilterTypes', valueArray)
			context.commit('setAllTypes', tempArray)
		})
	},
	/**
	 * Filtering display results by updating resultsList.
	 * @param {*} context context
	 * @param {*} type type of location
	 */
	filterResultsList (context) {
		var shownLocations = state.fetchedLocations.filter(loc => {
			var typeId = (() => {
				var tempSplitArr = loc.type.split('/')
				return Number(tempSplitArr[tempSplitArr.length - 2])
			})()
			return state.filterTypes.includes(typeId)
		})
		context.commit('setResultsList', shownLocations)
		context.commit('setResultsCount')
	},
	resumeResultsList (context) {
		context.commit('setResultsList', state.fetchedLocations)
		context.commit('setResultsCount')
	},
	// temporary flush both resultsList and fetchedResults
	flushResultsList (context) {
		context.commit('setResultsList', [])
		context.commit('setResultsCount')
		context.commit('setFetchedLocations', [])
	},
	/**
	 * Getting detailed information for a particular location, using its id.
	 * @param {*} context context
	 * @param {*} id Id of location. Used for fetching detailed information from backend.
	 */
	getLocation (context, id) {
		return axios.get(API.LOCATION.GET_LOCATION(id))
			.then(res => {
				context.commit('setLocation', res.data)
			})
			.catch(e => { window.console.error(e) })
	},
	addPopup (context, popup) {
		if (context.state.popup !== null) {
			context.state.popup.remove()
			context.state.popup = null
		}
		context.commit(popup)
	},
	delPopup (context) {
		if (context.state.popup !== null) {
			context.state.popup.remove()
			context.state.popup = null
		}
	},
	/**
	 * Set location to null. Used for back to result list from detailed view.
	 * @param {*} context context
	 */
	flushLocation (context) {
		context.commit('setLocation', null)
	},
	/**
	 * Setting center location, invoked by components.
	 * @param {*} context context
	 * @param {*} geoLocationCoords new center coordinate
	 */
	setCenterLocation (context, geoLocationCoords) {
		// Argument coord is in format of [lng, lat]
		context.commit('setCenterLocation', geoLocationCoords)
	},
	/**
	 * Setting user's current location, invoked by components.
	 * @param {*} context context
	 * @param {*} geoLocationCoords new user location
	 */
	setCurrentLocation (context, geoLocationCoords) {
		// Argument coord is in format of [lng, lat]
		context.commit('setCurrentLocation', geoLocationCoords)
		context.commit('setCenterLocation', geoLocationCoords)
	},
	/**
	 * Update map view boundary after changed.
	 * @param {*} context context
	 * @param {Object} newBoxBound new mapview bound coordinates. (format: {ne: [lng, lat], sw: [lng, lat]})
	 */
	updateBoxBound (context, newBoxBound) {
		context.commit('setBoxBound', newBoxBound)
	},
	/**
	 * Update query parameters
	 * @param {*} context context
	 * @param {*} form form of query conditions
	 */
	setQueryParams (context, form) {
		context.commit('setQueryParams', form)
	},
	/**
	 * Set resultsCount to searching value (-1)
	 * @param {*} context context
	 */
	setSearchText (context, text) {
		context.commit('setSearchText', text)
	},
	/**
	 * Set resultCount to searching status
	 * @param {*} context context
	 */
	setResultsCountToSearching (context) {
		context.commit('setResultsCount', true)
	},
	/**
	 * Set id of hovered location marker
	 * @param {*} context context
	 * @param {*} id marker of location id being hovered
	 */
	updateOnHoverLocationId (context, id) {
		context.commit('setOnHoverLocationId', id)
	}
}

export default {
	state,
	getters,
	mutations,
	actions,
	namespaced: true
}
