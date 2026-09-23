const PctFormat = {
    format: (value: number) => {
        return value * 100;
    },
    parse: (value: number) => {
        return value / 100;
    },
};

export const Formats = {
    pct: PctFormat,
};
