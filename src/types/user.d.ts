export interface UserInfoResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        mid: number;
        name: string;
        sex: string;
        face: string;
        face_nft: number;
        face_nft_type: number;
        sign: string;
        rank: number;
        level: number;
        jointime: number;
        moral: number;
        silence: number;
        coins: number;
        fans_badge: boolean;
        fans_medal: any;
        official: any;
        vip: {
            type: number;
            status: number;
            due_date: number;
            vip_pay_type: number;
            theme_type: number;
            label: {
                path: string;
                text: string;
                label_theme: string;
                text_color: string;
                bg_style: number;
                bg_color: string;
                border_color: string;
                use_img_label: boolean;
                img_label_uri_hans: string;
                img_label_uri_hant: string;
                img_label_uri_hans_static: string;
                img_label_uri_hant_static: string;
            };
            avatar_subscript: number;
            nickname_color: string;
            role: number;
            avatar_subscript_url: string;
            tv_vip_status: number;
            tv_vip_pay_type: number;
        };
        pendant: any;
        nameplate: any;
        user_honour_info: any;
        is_followed: boolean;
        top_photo_v2: {
            l_200h_img: string;
            l_img: string;
        }
        theme: any;
        sys_notice: any;
        live_room: any;
        birthday: string;
        school: any;
        profession: any;
        tags: any;
        series: any;
        is_senior_member: number;
        mcn_info: any;
        gaia_res_type: number;
        gaia_data: any;
        is_risk: boolean;
        elec: any;
        contract: any;
    };
}

export interface NavInfoResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        isLogin: boolean;
        email_verified: number;
        face: string;
        level_info: any;
        mid: number;
        mobile_verified: number;
        money: number;
        moral: number;
        official: any;
        officialVerify: any;
        pendant: any;
        scores: number;
        uname: string;
        vipDueDate: number;
        vipStatus: number;
        vipType: number;
        vip_pay_type: number;
        vip_theme_type: number;
        vip_label: any;
        vip_avatar_subscript: number;
        vip_nickname_color: string;
        wallet: any;
        has_shop: boolean;
        shop_url: string;
        allowance_count: number;
        answer_status: number;
        is_senior_member: number;
        wbi_img: {
            img_url: string,
            sub_url: string,
        };
        is_jury: boolean;
    };
}

export interface UserStatResp {
    code: number;
    message: string;
    ttl: number;
    data: {
        following: number;
        follower: number;
        dynamic_count: number;
    };
}