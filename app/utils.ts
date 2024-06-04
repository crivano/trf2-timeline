'use server'

import authOptions from '../app/api/auth/[...nextauth]/options'
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation'

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

export const getCurrentUser = async () => {
    const session = await getServerSession(authOptions);
    if (!session) {
        return undefined
    }
    // console.log('session', session)
    const user = session.user
    return user
}

export const assertCurrentUser = async () => {
    const user = await getCurrentUser()
    if (!user) redirect('/auth/signin')
    return user
}

