#include <spake2/spake2.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>

static void exchange(int wrong_password,int wrong_name) {
    const uint8_t client[]="adb pair client",server[]="adb pair server",pw[]="test-only-code-and-exporter",bad[]="wrong-test-only-password",name[]="wrong-name";
    struct spake2_ctx_st *a=SPAKE2_CTX_new(spake2_role_alice,client,sizeof(client),server,sizeof(server));
    struct spake2_ctx_st *b=SPAKE2_CTX_new(spake2_role_bob,wrong_name?name:server,wrong_name?sizeof(name):sizeof(server),client,sizeof(client));
    assert(a&&b);
    uint8_t am[32],bm[32],ak[64],bk[64];size_t al=0,bl=0,akl=0,bkl=0;
    assert(SPAKE2_generate_msg(a,am,&al,sizeof(am),pw,sizeof(pw))==1);
    assert(SPAKE2_generate_msg(b,bm,&bl,sizeof(bm),wrong_password?bad:pw,wrong_password?sizeof(bad):sizeof(pw))==1);
    assert(SPAKE2_process_msg(a,ak,&akl,sizeof(ak),bm,bl)==1);
    assert(SPAKE2_process_msg(b,bk,&bkl,sizeof(bk),am,al)==1);
    assert(akl==64&&bkl==64);
    if(wrong_password||wrong_name)assert(memcmp(ak,bk,64)!=0);else assert(memcmp(ak,bk,64)==0);
    SPAKE2_CTX_free(a);SPAKE2_CTX_free(b);
}
int main(void) {
    for(int i=0;i<64;i++){exchange(0,0);exchange(1,0);exchange(0,1);}
    puts("PASS: 192 native SPAKE2 exchanges (64 matching, 64 wrong password, 64 wrong peer name). Linux harness, not Android physical pairing.");
    return 0;
}
