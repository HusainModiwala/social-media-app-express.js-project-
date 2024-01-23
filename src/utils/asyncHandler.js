const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        try {
            //console.log(requestHandler.toString());
            await requestHandler(req, res, next);
        } catch (err) {
            console.log(err);
            //return res.status(err.statusCode).json({error: err.message});
            return res.status(err.statusCode || 500).json({ error: err.message });

            //next(err);
        }
    };
};

export default asyncHandler