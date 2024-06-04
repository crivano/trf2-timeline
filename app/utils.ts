'use server'

export const convertBrazilianValueToNumber = (value) => {
    if (typeof value === 'string') {
        value = value.replace(/\./g, '').replace(',', '.')
    }
    return value
}

export const slugify = (str) => {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, remove numbers etc
    const from = "àáäâãèéëêìíïîòóöôõùúüûñç·/_,:;";
    const to = "aaaaaeeeeiiiiooooouuuunc------";

    for (let i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z -]/g, '') // remove invalid chars and numbers
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-') // collapse dashes
        .replace(/-+$/g, '') // remove trailing -
        .replace(/^-+/g, '') // remove leading -

    return str;
}