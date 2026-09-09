
/**
 * echart图表props
 */
export const echartProps = {
    i: {
        type: [String,Number],
        default: ''
    },
	id: {
	    type: String,
	    default: ''
	},
    size: {
        type: Object,
        default: () => {},
    },
    config: {
        type: Object,
        default: () => ({} as any),
    },
    height:{
        type: Number,
    },
    compName:{
        type: String,
        default: ''
    },
    horizontal:{
        type: Boolean,
        default: false
    },
	isView:{
	    type: Boolean,
	    default: true
	},
    appId:{
        type: String,
        default: ''
    },
    izBigScreen:{
        type: Boolean,
        default: false
    }
}
