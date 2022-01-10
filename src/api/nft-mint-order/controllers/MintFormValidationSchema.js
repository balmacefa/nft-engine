const { yup } = require('@strapi/utils');

// regex validate if a number is between 0.01 and 10 (inclusive) and is a float number with two digits after the decimal point
const validateRoyaltyRate = (value) => {
    value = parseFloat(value);
    if (isNaN(value)) {
        return false;
    }
    if (value < 0.01 || value > 10) {
        return false;
    }
    if (value.toString().split(".")?.[1]?.length > 2) {
        return false;
    }
    return true;
}

const splitAddressObjectSchema = yup.object().shape({
    address: yup.string().test(
        'is-royalty-rate-set-but-no-royalty-address',
        'Royalties rate is set but no royalty address',
        (value, context) => {
            const { address, splitRoyaltyRate } = context.parent;
            if (splitRoyaltyRate.length > 0 && address.length === 0) {
                return false;
            }
            return true;
        }
    ),
    splitRoyaltyRate: yup.string().when('address', {
        is: (address) => address.length > 0,
        then: yup.string().required('Royalty rate is required')
            .test(
                'validate-royalty-rate',
                'Invalid Royalty rate: max length of 10; min of 0.01; increment of 0.01',
                validateRoyaltyRate
            ),
    })
});

const schema = yup.object({
    tikTokUrl: yup.number().required("TikTok URL is required"),
    blockchain: yup.string().required("Blockchain is required"),
    singleAddress: yup.string().required("Address is required"),
    // extraComment max length is 255
    extraComment: yup.string().max(255, "Comment is too long, max 255 characters"),

    isSplitRoyaltyRate: yup.boolean(),

    // numbe: max length of 10; min of 0.01; increment of 0.01
    royaltyRate: yup.string().when("isSplitRoyaltyRate", {
        is: false,
        then: yup.string().required("Royalty rate is required")
            .test(
                'validate-royalty-rate',
                'Invalid Royalty rate: max length of 10; min of 0.01; increment of 0.01',
                validateRoyaltyRate
            ),
    }),

    splitAddress: yup.array().when("isSplitRoyaltyRate", {
        is: true,
        then: yup.array().of(splitAddressObjectSchema)
    }),
    s_v_web_id: yup.string().required("S_V_Web_ID is required"),
    sid_ucp_v1: yup.string().required("sid_ucp_v1 is required"),
}).required();

export default schema;
